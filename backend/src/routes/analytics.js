'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');

router.use(authenticate);

// Admin/institution-wide analytics
router.get('/institution', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const instId = req.user.institution_id;

    const [users, projects, courses, attendance] = await Promise.all([
      query(`SELECT role, COUNT(*) AS count FROM users WHERE institution_id = $1 GROUP BY role`, [instId]),
      query(`SELECT status, COUNT(*) AS count FROM research_projects WHERE institution_id = $1 GROUP BY status`, [instId]),
      query(`SELECT COUNT(*) AS total, SUM(total_enrolled) AS enrollments FROM courses WHERE institution_id = $1`, [instId]),
      query(`SELECT
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'present') AS present
             FROM attendance_records ar
             JOIN class_sessions cs ON ar.session_id = cs.id
             WHERE cs.instructor_id IN (SELECT id FROM users WHERE institution_id = $1)`, [instId]),
    ]);

    res.json({
      success: true,
      data: {
        users: users.rows,
        projects: projects.rows,
        courses: courses.rows[0],
        attendanceRate: attendance.rows[0].total > 0
          ? Math.round((attendance.rows[0].present / attendance.rows[0].total) * 100)
          : 0,
      },
    });
  } catch (err) { next(err); }
});

// Professor analytics
router.get('/professor', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const guideId = req.user.id;

    const [scholars, goalStats, recentActivity, publicationsByMonth] = await Promise.all([
      query(`SELECT
               COUNT(*) AS total_scholars,
               COUNT(*) FILTER (WHERE rp.status = 'active') AS active,
               ROUND(AVG(rp.completion_percentage)) AS avg_completion
             FROM research_projects rp WHERE rp.guide_id = $1`, [guideId]),
      query(`SELECT
               status,
               COUNT(*) AS count
             FROM goals WHERE created_by = $1
             GROUP BY status`, [guideId]),
      query(`SELECT ra.type, ra.title, ra.created_at, u.first_name || ' ' || u.last_name AS scholar_name
             FROM research_activities ra
             JOIN research_projects rp ON ra.project_id = rp.id
             JOIN users u ON rp.scholar_id = u.id
             WHERE rp.guide_id = $1
             ORDER BY ra.created_at DESC LIMIT 15`, [guideId]),
      query(`SELECT
               DATE_TRUNC('month', p.publication_date) AS month,
               COUNT(*) AS count
             FROM publications p
             JOIN research_projects rp ON p.project_id = rp.id
             WHERE rp.guide_id = $1 AND p.publication_date > NOW() - INTERVAL '12 months'
             GROUP BY month ORDER BY month`, [guideId]),
    ]);

    res.json({
      success: true,
      data: {
        scholars: scholars.rows[0],
        goalStats: goalStats.rows,
        recentActivity: recentActivity.rows,
        publicationTrend: publicationsByMonth.rows,
      },
    });
  } catch (err) { next(err); }
});

// Student analytics
router.get('/student', async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const [goals, attendance, examScores, courseProgress] = await Promise.all([
      query(`SELECT status, COUNT(*) AS count, ROUND(AVG(completion_percentage)) AS avg
             FROM goals WHERE assigned_to = $1 GROUP BY status`, [studentId]),
      query(`SELECT
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE status = 'present') AS present,
               COUNT(*) FILTER (WHERE status = 'absent') AS absent,
               COUNT(*) FILTER (WHERE status = 'late') AS late
             FROM attendance_records WHERE user_id = $1`, [studentId]),
      query(`SELECT e.title, ea.marks_obtained, ea.percentage, ea.grade, ea.submitted_at
             FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id
             WHERE ea.student_id = $1 AND ea.status = 'submitted'
             ORDER BY ea.submitted_at DESC LIMIT 10`, [studentId]),
      query(`SELECT c.title, ce.progress_percentage, ce.enrolled_at
             FROM course_enrollments ce JOIN courses c ON ce.course_id = c.id
             WHERE ce.user_id = $1 AND ce.is_active = TRUE`, [studentId]),
    ]);

    const attendanceRate = attendance.rows[0].total > 0
      ? Math.round((attendance.rows[0].present / attendance.rows[0].total) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        goals: goals.rows,
        attendance: { ...attendance.rows[0], rate: attendanceRate },
        examScores: examScores.rows,
        courses: courseProgress.rows,
      },
    });
  } catch (err) { next(err); }
});

// Performance heatmap data
router.get('/heatmap/:userId?', async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.id;

    const result = await query(
      `SELECT
         DATE(gu.created_at) AS date,
         COUNT(*) AS updates,
         MAX(gu.new_percentage) AS max_completion
       FROM goal_updates gu
       WHERE gu.updated_by = $1
         AND gu.created_at > NOW() - INTERVAL '365 days'
       GROUP BY DATE(gu.created_at)
       ORDER BY date`,
      [userId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
