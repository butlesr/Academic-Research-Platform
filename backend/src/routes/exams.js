'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');

router.use(authenticate);

router.post('/', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { courseId, title, description, instructions, type, totalMarks, passingMarks, durationMinutes, startTime, endTime, shuffleQuestions, shuffleOptions, negativeMarking, negativeMarksPerWrong, aiProctoring, questions } = req.body;

    const exam = await query(
      `INSERT INTO exams (course_id, created_by, title, description, instructions, type, total_marks, passing_marks, duration_minutes, start_time, end_time, shuffle_questions, shuffle_options, negative_marking, negative_marks_per_wrong, ai_proctoring)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [courseId, req.user.id, title, description, instructions, type, totalMarks, passingMarks, durationMinutes, startTime, endTime, shuffleQuestions || true, shuffleOptions || true, negativeMarking || false, negativeMarksPerWrong || 0, aiProctoring || false]
    );

    if (questions?.length) {
      for (const q of questions) {
        await query(
          `INSERT INTO exam_questions (exam_id, question, type, options, correct_answer, marks, explanation, order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [exam.rows[0].id, q.question, q.type, JSON.stringify(q.options), q.correctAnswer, q.marks, q.explanation, q.orderIndex]
        );
      }
    }

    res.status(201).json({ success: true, data: exam.rows[0] });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.*, COUNT(ea.id) AS attempt_count, u.first_name || ' ' || u.last_name AS created_by_name
       FROM exams e JOIN users u ON e.created_by = u.id
       LEFT JOIN exam_attempts ea ON e.id = ea.exam_id
       WHERE (e.created_by = $1 OR (e.is_published = TRUE AND e.start_time <= NOW() AND e.end_time >= NOW()))
       GROUP BY e.id, u.first_name, u.last_name ORDER BY e.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

router.post('/:id/start', async (req, res, next) => {
  try {
    const exam = await query(`SELECT * FROM exams WHERE id = $1 AND is_published = TRUE AND start_time <= NOW() AND end_time >= NOW()`, [req.params.id]);
    if (!exam.rows.length) throw new AppError('Exam not available', 400);

    const existing = await query(`SELECT id FROM exam_attempts WHERE exam_id = $1 AND student_id = $2 AND status = 'in_progress'`, [req.params.id, req.user.id]);
    if (existing.rows.length) return res.json({ success: true, data: { attemptId: existing.rows[0].id } });

    let questions = await query(`SELECT id, question, type, options, marks FROM exam_questions WHERE exam_id = $1`, [req.params.id]);
    if (exam.rows[0].shuffle_questions) questions.rows = questions.rows.sort(() => Math.random() - 0.5);

    const attempt = await query(
      `INSERT INTO exam_attempts (exam_id, student_id) VALUES ($1,$2) RETURNING id`,
      [req.params.id, req.user.id]
    );

    res.json({ success: true, data: { attemptId: attempt.rows[0].id, questions: questions.rows, exam: exam.rows[0] } });
  } catch (err) { next(err); }
});

router.post('/attempts/:attemptId/submit', async (req, res, next) => {
  try {
    const { answers } = req.body;

    const attempt = await query(`SELECT ea.*, e.negative_marking, e.negative_marks_per_wrong FROM exam_attempts ea JOIN exams e ON ea.exam_id = e.id WHERE ea.id = $1 AND ea.student_id = $2`, [req.params.attemptId, req.user.id]);
    if (!attempt.rows.length) throw new AppError('Attempt not found', 404);

    const questions = await query(`SELECT id, correct_answer, marks FROM exam_questions WHERE exam_id = $1`, [attempt.rows[0].exam_id]);

    let totalObtained = 0;
    for (const q of questions.rows) {
      const studentAnswer = answers[q.id];
      if (studentAnswer === q.correct_answer) {
        totalObtained += parseFloat(q.marks);
      } else if (studentAnswer && attempt.rows[0].negative_marking) {
        totalObtained -= parseFloat(attempt.rows[0].negative_marks_per_wrong || 0);
      }
    }

    const examData = await query(`SELECT total_marks, passing_marks FROM exams WHERE id = $1`, [attempt.rows[0].exam_id]);
    const totalMarks = parseFloat(examData.rows[0].total_marks);
    const percentage = Math.round((totalObtained / totalMarks) * 100);
    const passed = totalObtained >= parseFloat(examData.rows[0].passing_marks);

    const result = await query(
      `UPDATE exam_attempts SET status = 'submitted', submitted_at = NOW(), answers = $1, marks_obtained = $2, percentage = $3, passed = $4, time_taken_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
       WHERE id = $5 RETURNING *`,
      [JSON.stringify(answers), Math.max(0, totalObtained), percentage, passed, req.params.attemptId]
    );

    res.json({ success: true, data: { ...result.rows[0], percentage, passed } });
  } catch (err) { next(err); }
});

module.exports = router;
