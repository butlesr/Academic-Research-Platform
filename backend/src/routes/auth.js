'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .withMessage('Password must include uppercase, lowercase, number, and special character');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('firstName').trim().isLength({ min: 2 }),
  body('lastName').trim().isLength({ min: 2 }),
  passwordRules,
  body('role').optional().isIn(['professor', 'phd_scholar', 'pg_student', 'project_student', 'external_examiner']),
  validate,
], authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], authController.login);

router.post('/refresh-token', [
  body('refreshToken').notEmpty(),
  validate,
], authController.refreshToken);

router.post('/logout', authenticate, authController.logout);

router.get('/verify-email/:token', [
  param('token').isLength({ min: 32 }),
  validate,
], authController.verifyEmail);

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
  validate,
], authController.forgotPassword);

router.post('/reset-password/:token', [
  param('token').isLength({ min: 32 }),
  passwordRules,
  validate,
], authController.resetPassword);

router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  passwordRules,
  validate,
], authController.changePassword);

router.post('/mfa/setup', authenticate, authController.setupMFA);
router.post('/mfa/enable', authenticate, [
  body('token').isLength({ min: 6, max: 6 }).isNumeric(),
  validate,
], authController.enableMFA);
router.post('/mfa/disable', authenticate, [
  body('token').isLength({ min: 6, max: 6 }).isNumeric(),
  validate,
], authController.disableMFA);

module.exports = router;
