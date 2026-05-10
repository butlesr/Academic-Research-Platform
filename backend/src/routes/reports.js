'use strict';

const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { generatePerformanceReport } = require('../services/aiService');

router.use(authenticate);

// Generate PDF progress report
router.get('/progress/:scholarId', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { scholarId } = req.params;

    const [scholar, projects, goals, attendance, publications] = await Promise.all([
      query(`SELECT first_name, last_name, email, enrollment_number FROM users WHERE id = $1`, [scholarId]),
      query(`SELECT title, type, status, completion_percentage, start_date, expected_end_date FROM research_projects WHERE scholar_id = $1`, [scholarId]),
      query(`SELECT status, COUNT(*) AS count FROM goals WHERE assigned_to = $1 GROUP BY status`, [scholarId]),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'present') AS present FROM attendance_records WHERE user_id = $1`, [scholarId]),
      query(`SELECT title, type, status, publication_date FROM publications WHERE scholar_id = $1 ORDER BY publication_date DESC`, [scholarId]),
    ]);

    if (!scholar.rows.length) return res.status(404).json({ success: false, message: 'Scholar not found' });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="progress-report-${scholarId}.pdf"`);
    doc.pipe(res);

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill('#1e3a5f');
    doc.fill('white').fontSize(22).font('Helvetica-Bold').text('Academic Research Platform', 50, 25);
    doc.fontSize(12).font('Helvetica').text('Research Progress Report', 50, 52);
    doc.fill('black').moveDown(2);

    // Scholar info
    const s = scholar.rows[0];
    doc.fontSize(18).font('Helvetica-Bold').text(`${s.first_name} ${s.last_name}`, 50, 110);
    doc.fontSize(11).font('Helvetica').fillColor('#555')
       .text(`Email: ${s.email}`, 50, 135)
       .text(`Enrollment: ${s.enrollment_number || 'N/A'}`, 50, 150)
       .text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 50, 165);

    doc.moveDown(2).fillColor('black');

    // Projects
    doc.fontSize(14).font('Helvetica-Bold').text('Research Projects', 50, 200);
    doc.moveTo(50, 218).lineTo(545, 218).stroke('#1e3a5f');
    doc.moveDown();

    projects.rows.forEach((p) => {
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e3a5f').text(p.title, 50);
      doc.font('Helvetica').fillColor('#333').fontSize(10)
         .text(`Type: ${p.type?.replace(/_/g, ' ')} | Status: ${p.status} | Progress: ${p.completion_percentage}%`, 50);
      doc.moveDown(0.5);
    });

    // Goals summary
    doc.moveDown().fontSize(14).font('Helvetica-Bold').fillColor('black').text('Goals Summary');
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#1e3a5f');
    doc.moveDown();

    const goalTotal = goals.rows.reduce((a, g) => a + parseInt(g.count), 0);
    const goalCompleted = goals.rows.find((g) => g.status === 'completed')?.count || 0;
    doc.fontSize(11).font('Helvetica').text(`Total Goals: ${goalTotal}`);
    doc.text(`Completed: ${goalCompleted} (${goalTotal > 0 ? Math.round((goalCompleted / goalTotal) * 100) : 0}%)`);

    // Attendance
    const attendanceRate = attendance.rows[0].total > 0
      ? Math.round((attendance.rows[0].present / attendance.rows[0].total) * 100) : 0;
    doc.moveDown().fontSize(14).font('Helvetica-Bold').text('Attendance');
    doc.fontSize(11).font('Helvetica').text(`Overall Attendance: ${attendanceRate}% (${attendance.rows[0].present}/${attendance.rows[0].total} sessions)`);

    doc.end();
  } catch (err) { next(err); }
});

// Export attendance as Excel
router.get('/attendance/excel', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { courseId, startDate, endDate } = req.query;

    const result = await query(
      `SELECT u.first_name || ' ' || u.last_name AS name, u.email,
              cs.scheduled_at, cs.title AS session, ar.status
       FROM attendance_records ar
       JOIN users u ON ar.user_id = u.id
       JOIN class_sessions cs ON ar.session_id = cs.id
       WHERE cs.instructor_id = $1
         AND ($2::UUID IS NULL OR cs.course_id = $2)
         AND ($3::DATE IS NULL OR cs.scheduled_at::DATE >= $3)
         AND ($4::DATE IS NULL OR cs.scheduled_at::DATE <= $4)
       ORDER BY cs.scheduled_at, u.last_name`,
      [req.user.id, courseId || null, startDate || null, endDate || null]
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Academic Research Platform';
    const sheet = workbook.addWorksheet('Attendance Report');

    sheet.columns = [
      { header: 'Student Name', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Session Date', key: 'date', width: 20 },
      { header: 'Session Title', key: 'session', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };

    result.rows.forEach((row) => {
      sheet.addRow({
        name: row.name,
        email: row.email,
        date: new Date(row.scheduled_at).toLocaleDateString('en-IN'),
        session: row.session,
        status: row.status.toUpperCase(),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
