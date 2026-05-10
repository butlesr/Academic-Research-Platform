'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const { deleteCache } = require('../config/redis');
const bcrypt = require('bcryptjs');

router.use(authenticate, authorize('super_admin', 'admin'));

// Institution management
router.post('/institutions', authorize('super_admin'), async (req, res, next) => {
  try {
    const { name, code, address, city, state, phone, email, website } = req.body;
    const result = await query(
      `INSERT INTO institutions (name, code, address, city, state, phone, email, website)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, code, address, city, state, phone, email, website]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/institutions', authorize('super_admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT i.*, COUNT(DISTINCT u.id) AS user_count, COUNT(DISTINCT d.id) AS dept_count
       FROM institutions i
       LEFT JOIN users u ON i.id = u.institution_id AND u.status = 'active'
       LEFT JOIN departments d ON i.id = d.institution_id AND d.is_active = TRUE
       GROUP BY i.id ORDER BY i.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

// Department management
router.post('/departments', async (req, res, next) => {
  try {
    const { institutionId, name, code, description } = req.body;
    const result = await query(
      `INSERT INTO departments (institution_id, name, code, description) VALUES ($1,$2,$3,$4) RETURNING *`,
      [institutionId || req.user.institution_id, name, code, description]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

// User management
router.get('/users', async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status,
              u.created_at, u.last_login, d.name AS department_name,
              COUNT(*) OVER() AS total_count
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE ($1::text IS NULL OR u.role = $1)
         AND ($2::text IS NULL OR u.status = $2)
         AND ($3::text IS NULL OR u.first_name ILIKE '%' || $3 || '%'
              OR u.last_name ILIKE '%' || $3 || '%' OR u.email ILIKE '%' || $3 || '%')
         AND u.institution_id = $4
       ORDER BY u.created_at DESC
       LIMIT $5 OFFSET $6`,
      [role || null, status || null, search || null, req.user.institution_id, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { page: parseInt(page), total: parseInt(result.rows[0]?.total_count || 0) },
    });
  } catch (err) { next(err); }
});

// Update user status
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    await query(`UPDATE users SET status = $1 WHERE id = $2`, [status, req.params.id]);
    await deleteCache(`user:${req.params.id}`);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Create user (admin)
router.post('/users', async (req, res, next) => {
  try {
    const { email, firstName, lastName, role, departmentId, designation, phone } = req.body;
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const result = await query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, institution_id, department_id, designation, status, email_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',true) RETURNING id, email, first_name, last_name, role`,
      [email, phone, passwordHash, firstName, lastName, role, req.user.institution_id, departmentId, designation]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      tempPassword,
    });
  } catch (err) { next(err); }
});

// System analytics
router.get('/stats', async (req, res, next) => {
  try {
    const instId = req.user.institution_id;
    const [users, projects, courses, goals] = await Promise.all([
      query(`SELECT status, role, COUNT(*) AS count FROM users WHERE institution_id = $1 GROUP BY status, role`, [instId]),
      query(`SELECT status, COUNT(*) FROM research_projects WHERE institution_id = $1 GROUP BY status`, [instId]),
      query(`SELECT COUNT(*) AS total, SUM(total_enrolled) AS enrollments FROM courses WHERE institution_id = $1`, [instId]),
      query(`SELECT status, COUNT(*) FROM goals WHERE created_by IN (SELECT id FROM users WHERE institution_id = $1) GROUP BY status`, [instId]),
    ]);

    res.json({ success: true, data: { users: users.rows, projects: projects.rows, courses: courses.rows[0], goals: goals.rows } });
  } catch (err) { next(err); }
});

// Audit logs
router.get('/audit-logs', authorize('super_admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT al.*, u.email, u.first_name || ' ' || u.last_name AS user_name
       FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
