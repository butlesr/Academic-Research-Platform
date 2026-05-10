'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { getCache, setCache } = require('../config/redis');
const AppError = require('../utils/AppError');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      throw new AppError(err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token', 401);
    }

    // Check Redis cache first
    const cacheKey = `user:${decoded.id}`;
    let user = await getCache(cacheKey);

    if (!user) {
      const result = await query(
        `SELECT id, email, role, status, institution_id, department_id,
                first_name, last_name, avatar_url, mfa_enabled,
                password_changed_at, notification_preferences, preferences
         FROM users WHERE id = $1`,
        [decoded.id]
      );
      if (!result.rows.length) throw new AppError('User not found', 401);
      user = result.rows[0];
      await setCache(cacheKey, user, 300);
    }

    if (user.status !== 'active') {
      throw new AppError('Account is not active. Please contact administrator.', 403);
    }

    // Check if token was issued before password change
    if (user.password_changed_at) {
      const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
      if (decoded.iat < changedAt) {
        throw new AppError('Password was recently changed. Please log in again.', 401);
      }
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`Role '${req.user.role}' is not authorized for this action`, 403));
    }
    next();
  };
};

const authorizeOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    try {
      const ownerId = await getResourceOwnerId(req);
      const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
      const isOwner = ownerId === req.user.id;

      if (!isAdmin && !isOwner) {
        throw new AppError('You are not authorized to access this resource', 403);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

module.exports = { authenticate, authorize, authorizeOwnerOrAdmin };
