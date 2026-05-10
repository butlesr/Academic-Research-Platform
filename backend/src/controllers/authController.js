'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { query, transaction } = require('../config/database');
const { setCache, deleteCache } = require('../config/redis');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

const signToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRE || '7d',
});

const signRefreshToken = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
  expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
});

const createAuthResponse = async (user, req, res, statusCode = 200) => {
  const accessToken = signToken(user.id, user.role);
  const refreshToken = signRefreshToken(user.id);

  // Store refresh token session
  await query(
    `INSERT INTO user_sessions (user_id, refresh_token, device_info, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '30 days')`,
    [
      user.id, refreshToken,
      JSON.stringify({ platform: req.headers['x-platform'] || 'web' }),
      req.ip, req.headers['user-agent'],
    ]
  );

  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  const { password_hash, mfa_secret, reset_token, verify_token, ...safeUser } = user;

  res.status(statusCode).json({
    success: true,
    message: 'Authentication successful',
    data: {
      user: safeUser,
      tokens: { accessToken, refreshToken },
    },
  });
};

exports.register = async (req, res, next) => {
  try {
    const {
      email, password, firstName, lastName, phone,
      role, institutionId, departmentId, designation,
    } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
    if (existing.rows.length) throw new AppError('Email or phone already registered', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role,
                          institution_id, department_id, designation, verify_token, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending_verification')
       RETURNING id, email, first_name, last_name, role, status`,
      [email, phone, passwordHash, firstName, lastName,
       role || 'pg_student', institutionId, departmentId, designation, verifyToken]
    );

    const user = result.rows[0];

    await sendEmail({
      to: email,
      subject: 'Verify Your Academic Platform Account',
      template: 'email-verification',
      data: { name: firstName, verifyUrl: `${process.env.FRONTEND_URL}/verify-email/${verifyToken}` },
    });

    logger.info(`New user registered: ${email} (${role})`);

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email to continue.',
      data: { userId: user.id, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, mfaToken } = req.body;

    const result = await query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    if (!result.rows.length) throw new AppError('Invalid email or password', 401);

    const user = result.rows[0];

    if (user.status === 'pending_verification') {
      throw new AppError('Please verify your email address before logging in', 403);
    }
    if (user.status !== 'active') {
      throw new AppError('Your account is not active. Contact administrator.', 403);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) throw new AppError('Invalid email or password', 401);

    // MFA check
    if (user.mfa_enabled) {
      if (!mfaToken) {
        return res.status(200).json({
          success: true,
          requiresMFA: true,
          message: 'MFA token required',
          data: { userId: user.id },
        });
      }
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: mfaToken,
        window: 1,
      });
      if (!verified) throw new AppError('Invalid MFA token', 401);
    }

    // Log audit
    await query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
       VALUES ($1, 'user_login', $2, $3)`,
      [user.id, req.ip, req.headers['user-agent']]
    );

    await createAuthResponse(user, req, res, 200);
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const sessionResult = await query(
      `SELECT * FROM user_sessions WHERE refresh_token = $1 AND user_id = $2 AND is_active = TRUE AND expires_at > NOW()`,
      [refreshToken, decoded.id]
    );
    if (!sessionResult.rows.length) throw new AppError('Session expired. Please log in again.', 401);

    const userResult = await query(
      `SELECT id, email, role, status, institution_id, first_name, last_name, avatar_url
       FROM users WHERE id = $1 AND status = 'active'`,
      [decoded.id]
    );
    if (!userResult.rows.length) throw new AppError('User not found', 401);

    const accessToken = signToken(decoded.id, userResult.rows[0].role);

    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query(
        `UPDATE user_sessions SET is_active = FALSE WHERE refresh_token = $1 AND user_id = $2`,
        [refreshToken, req.user.id]
      );
    }
    await deleteCache(`user:${req.user.id}`);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const result = await query(
      `UPDATE users SET email_verified = TRUE, status = 'active', verify_token = NULL
       WHERE verify_token = $1 AND status = 'pending_verification'
       RETURNING id, email, first_name`,
      [token]
    );
    if (!result.rows.length) throw new AppError('Invalid or expired verification token', 400);
    res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await query('SELECT id, first_name FROM users WHERE email = $1', [email]);

    // Always return 200 to prevent email enumeration
    if (result.rows.length) {
      const user = result.rows[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      await query(
        `UPDATE users SET reset_token = $1, reset_token_expires = NOW() + INTERVAL '1 hour' WHERE id = $2`,
        [tokenHash, user.id]
      );

      await sendEmail({
        to: email,
        subject: 'Password Reset - Academic Research Platform',
        template: 'password-reset',
        data: { name: user.first_name, resetUrl: `${process.env.FRONTEND_URL}/reset-password/${resetToken}` },
      });
    }

    res.json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await query(
      `SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()`,
      [tokenHash]
    );
    if (!result.rows.length) throw new AppError('Invalid or expired reset token', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL,
       password_changed_at = NOW() WHERE id = $2`,
      [passwordHash, result.rows[0].id]
    );

    // Invalidate all sessions
    await query(`UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1`, [result.rows[0].id]);
    await deleteCache(`user:${result.rows[0].id}`);

    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) throw new AppError('Current password is incorrect', 401);

    const newHash = await bcrypt.hash(newPassword, 12);
    await query(
      `UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2`,
      [newHash, req.user.id]
    );

    await deleteCache(`user:${req.user.id}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

exports.setupMFA = async (req, res, next) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `AcademicPlatform:${req.user.email}`,
      issuer: process.env.MFA_ISSUER || 'AcademicResearchPlatform',
    });

    await query(`UPDATE users SET mfa_secret = $1 WHERE id = $2`, [secret.base32, req.user.id]);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, data: { qrCode: qrCodeUrl, secret: secret.base32 } });
  } catch (err) {
    next(err);
  }
};

exports.enableMFA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await query(`SELECT mfa_secret FROM users WHERE id = $1`, [req.user.id]);

    const verified = speakeasy.totp.verify({
      secret: result.rows[0].mfa_secret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!verified) throw new AppError('Invalid MFA token', 400);

    await query(`UPDATE users SET mfa_enabled = TRUE WHERE id = $1`, [req.user.id]);
    await deleteCache(`user:${req.user.id}`);

    res.json({ success: true, message: 'Two-factor authentication enabled successfully' });
  } catch (err) {
    next(err);
  }
};

exports.disableMFA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await query(`SELECT mfa_secret FROM users WHERE id = $1`, [req.user.id]);

    const verified = speakeasy.totp.verify({
      secret: result.rows[0].mfa_secret,
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!verified) throw new AppError('Invalid MFA token', 400);

    await query(`UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL WHERE id = $1`, [req.user.id]);
    await deleteCache(`user:${req.user.id}`);

    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (err) {
    next(err);
  }
};
