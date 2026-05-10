'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { deleteCache } = require('../config/redis');
const AppError = require('../utils/AppError');
const { uploadToS3 } = require('../services/fileService');

const upload = multer({ limits: { fileSize: 5 * 1024 * 1024 }, storage: multer.memoryStorage() });

router.use(authenticate);

// Get current user profile
router.get('/me', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.*, i.name AS institution_name, d.name AS department_name
       FROM users u
       LEFT JOIN institutions i ON u.institution_id = i.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    const { password_hash, mfa_secret, reset_token, verify_token, ...user } = result.rows[0];
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// Update profile
router.patch('/me', async (req, res, next) => {
  try {
    const {
      firstName, lastName, phone, bio, designation,
      researchArea, specialization, linkedinUrl, orcidId, googleScholarUrl,
    } = req.body;

    const result = await query(
      `UPDATE users SET
         first_name = COALESCE($1, first_name),
         last_name = COALESCE($2, last_name),
         phone = COALESCE($3, phone),
         bio = COALESCE($4, bio),
         designation = COALESCE($5, designation),
         research_area = COALESCE($6, research_area),
         specialization = COALESCE($7, specialization),
         linkedin_url = COALESCE($8, linkedin_url),
         orcid_id = COALESCE($9, orcid_id),
         google_scholar_url = COALESCE($10, google_scholar_url),
         updated_at = NOW()
       WHERE id = $11
       RETURNING id, email, first_name, last_name, role, status`,
      [firstName, lastName, phone, bio, designation, researchArea, specialization, linkedinUrl, orcidId, googleScholarUrl, req.user.id]
    );

    await deleteCache(`user:${req.user.id}`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// Upload avatar
router.post('/me/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const key = `avatars/${req.user.id}-${Date.now()}`;
    const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);

    await query(`UPDATE users SET avatar_url = $1 WHERE id = $2`, [url, req.user.id]);
    await deleteCache(`user:${req.user.id}`);

    res.json({ success: true, data: { avatarUrl: url } });
  } catch (err) { next(err); }
});

// Update FCM token (push notifications)
router.patch('/me/fcm-token', async (req, res, next) => {
  try {
    await query(`UPDATE users SET fcm_token = $1 WHERE id = $2`, [req.body.fcmToken, req.user.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Update preferences
router.patch('/me/preferences', async (req, res, next) => {
  try {
    await query(
      `UPDATE users SET preferences = preferences || $1::jsonb WHERE id = $2`,
      [JSON.stringify(req.body), req.user.id]
    );
    await deleteCache(`user:${req.user.id}`);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Search users (for adding to groups, chats, etc.)
router.get('/search', async (req, res, next) => {
  try {
    const { q, role, institutionId } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const result = await query(
      `SELECT id, first_name, last_name, email, role, avatar_url, designation
       FROM users
       WHERE (
         first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
       )
       AND ($2::text IS NULL OR role = $2)
       AND ($3::UUID IS NULL OR institution_id = $3)
       AND status = 'active'
       AND id != $4
       LIMIT 20`,
      [`%${q}%`, role || null, institutionId || req.user.institution_id, req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, first_name, last_name, email, role, avatar_url, bio,
              designation, research_area, specialization, linkedin_url, orcid_id,
              google_scholar_url, created_at, department_id, institution_id
       FROM users WHERE id = $1 AND status = 'active'`,
      [req.params.id]
    );
    if (!result.rows.length) throw new AppError('User not found', 404);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
