'use strict';

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');

router.use(authenticate);

// Create class session
router.post('/sessions', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { courseId, title, type, scheduledAt, durationMinutes, location, isOnline } = req.body;

    const qrCode = uuidv4();
    const result = await query(
      `INSERT INTO class_sessions (course_id, instructor_id, title, type, scheduled_at, duration_minutes, location, is_online, qr_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [courseId, req.user.id, title, type || 'lecture', scheduledAt, durationMinutes || 60, location, isOnline, qrCode]
    );

    const qrCodeImage = await QRCode.toDataURL(`attendance:${qrCode}`);
    res.status(201).json({ success: true, data: { ...result.rows[0], qrCodeImage } });
  } catch (err) { next(err); }
});

// Open attendance for a session
router.patch('/sessions/:id/open', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    await query(
      `UPDATE class_sessions SET attendance_open = TRUE WHERE id = $1 AND instructor_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Mark attendance via QR
router.post('/mark/qr', async (req, res, next) => {
  try {
    const { qrCode, locationLat, locationLng } = req.body;

    const session = await query(
      `SELECT * FROM class_sessions WHERE qr_code = $1 AND attendance_open = TRUE`,
      [qrCode]
    );
    if (!session.rows.length) throw new AppError('Invalid QR code or attendance is closed', 400);

    await query(
      `INSERT INTO attendance_records (session_id, user_id, status, marked_by, method, location_lat, location_lng)
       VALUES ($1, $2, 'present', $2, 'qr', $3, $4)
       ON CONFLICT (session_id, user_id) DO UPDATE SET status = 'present', method = 'qr'`,
      [session.rows[0].id, req.user.id, locationLat, locationLng]
    );

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (err) { next(err); }
});

// Mark attendance manually
router.post('/sessions/:id/mark', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { attendanceData } = req.body;

    for (const { userId, status, remarks } of attendanceData) {
      await query(
        `INSERT INTO attendance_records (session_id, user_id, status, marked_by, remarks, method)
         VALUES ($1,$2,$3,$4,$5,'manual')
         ON CONFLICT (session_id, user_id) DO UPDATE SET status = $3, remarks = $5`,
        [req.params.id, userId, status, req.user.id, remarks]
      );
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Get attendance report
router.get('/report', async (req, res, next) => {
  try {
    const { userId, courseId, startDate, endDate } = req.query;
    const targetUserId = userId || req.user.id;

    const result = await query(
      `SELECT
         cs.scheduled_at, cs.title AS session_title, cs.type,
         ar.status, ar.method, ar.marked_at,
         c.title AS course_title
       FROM attendance_records ar
       JOIN class_sessions cs ON ar.session_id = cs.id
       LEFT JOIN courses c ON cs.course_id = c.id
       WHERE ar.user_id = $1
         AND ($2::UUID IS NULL OR cs.course_id = $2)
         AND ($3::DATE IS NULL OR cs.scheduled_at::DATE >= $3)
         AND ($4::DATE IS NULL OR cs.scheduled_at::DATE <= $4)
       ORDER BY cs.scheduled_at DESC`,
      [targetUserId, courseId || null, startDate || null, endDate || null]
    );

    const total = result.rows.length;
    const present = result.rows.filter((r) => r.status === 'present').length;
    const absent = result.rows.filter((r) => r.status === 'absent').length;

    res.json({
      success: true,
      data: {
        records: result.rows,
        summary: { total, present, absent, rate: total > 0 ? Math.round((present / total) * 100) : 0 },
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
