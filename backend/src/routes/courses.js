'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');

router.use(authenticate);

router.post('/', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { title, description, category, level, language, durationHours, isPublished, isSelfPaced, prerequisites, learningObjectives, tags } = req.body;
    const result = await query(
      `INSERT INTO courses (institution_id, department_id, instructor_id, title, description, category, level, language, duration_hours, is_published, is_self_paced, prerequisites, learning_objectives, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.institution_id, req.user.department_id, req.user.id, title, description, category, level, language || 'English', durationHours, isPublished || false, isSelfPaced || false, prerequisites, learningObjectives, tags]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT c.*, u.first_name || ' ' || u.last_name AS instructor_name,
              EXISTS(SELECT 1 FROM course_enrollments ce WHERE ce.course_id = c.id AND ce.user_id = $1) AS is_enrolled,
              COUNT(*) OVER() AS total_count
       FROM courses c JOIN users u ON c.instructor_id = u.id
       WHERE (c.is_published = TRUE OR c.instructor_id = $1)
         AND ($2::text IS NULL OR c.category = $2)
         AND ($3::text IS NULL OR c.title ILIKE '%' || $3 || '%')
       ORDER BY c.created_at DESC LIMIT $4 OFFSET $5`,
      [req.user.id, category || null, search || null, limit, offset]
    );
    res.json({ success: true, data: result.rows, pagination: { page: parseInt(page), total: parseInt(result.rows[0]?.total_count || 0) } });
  } catch (err) { next(err); }
});

router.post('/:id/enroll', async (req, res, next) => {
  try {
    await query(
      `INSERT INTO course_enrollments (course_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.user.id]
    );
    await query(`UPDATE courses SET total_enrolled = total_enrolled + 1 WHERE id = $1`, [req.params.id]);
    res.json({ success: true, message: 'Enrolled successfully' });
  } catch (err) { next(err); }
});

router.post('/:id/modules', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { title, description, orderIndex, durationMinutes } = req.body;
    const result = await query(
      `INSERT INTO course_modules (course_id, title, description, order_index, duration_minutes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, title, description, orderIndex, durationMinutes]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/:id/modules', async (req, res, next) => {
  try {
    const modules = await query(`SELECT * FROM course_modules WHERE course_id = $1 ORDER BY order_index`, [req.params.id]);
    const lessons = await query(
      `SELECT cl.*, lp.is_completed FROM course_lessons cl
       LEFT JOIN lesson_progress lp ON cl.id = lp.lesson_id AND lp.user_id = $2
       WHERE cl.module_id = ANY($1::UUID[]) ORDER BY cl.order_index`,
      [modules.rows.map((m: any) => m.id), req.user.id]
    );

    const modulesWithLessons = modules.rows.map((m) => ({
      ...m,
      lessons: lessons.rows.filter((l) => l.module_id === m.id),
    }));

    res.json({ success: true, data: modulesWithLessons });
  } catch (err) { next(err); }
});

router.patch('/lessons/:lessonId/progress', async (req, res, next) => {
  try {
    const { watchedDuration, isCompleted } = req.body;
    await query(
      `INSERT INTO lesson_progress (lesson_id, user_id, watched_duration, is_completed, completed_at)
       VALUES ($1,$2,$3,$4,CASE WHEN $4 THEN NOW() ELSE NULL END)
       ON CONFLICT (lesson_id, user_id) DO UPDATE SET watched_duration = $3, is_completed = $4, completed_at = CASE WHEN $4 THEN NOW() ELSE NULL END`,
      [req.params.lessonId, req.user.id, watchedDuration, isCompleted || false]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
