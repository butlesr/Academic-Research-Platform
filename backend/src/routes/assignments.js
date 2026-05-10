'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const { sendNotification } = require('../services/notificationService');
const { checkPlagiarism } = require('../services/aiService');

router.use(authenticate);

router.post('/', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const {
      courseId, groupId, title, description, instructions, type,
      maxMarks, passingMarks, dueDate, availableFrom, allowLateSubmission,
      latePenaltyPercent, maxAttempts, rubric, plagiarismCheck, isPublished,
    } = req.body;

    const result = await query(
      `INSERT INTO assignments
       (course_id, group_id, created_by, title, description, instructions, type,
        max_marks, passing_marks, due_date, available_from, allow_late_submission,
        late_penalty_percent, max_attempts, rubric, plagiarism_check, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [courseId, groupId, req.user.id, title, description, instructions, type || 'file_upload',
       maxMarks, passingMarks, dueDate, availableFrom || new Date(), allowLateSubmission || false,
       latePenaltyPercent || 0, maxAttempts || 1, JSON.stringify(rubric), plagiarismCheck || false, isPublished || false]
    );

    if (isPublished && groupId) {
      const members = await query(`SELECT user_id FROM research_group_members WHERE group_id = $1 AND is_active = TRUE`, [groupId]);
      for (const { user_id } of members.rows) {
        await sendNotification({ userId: user_id, type: 'task_assigned', title: 'New Assignment', body: `New assignment: ${title}`, data: { assignmentId: result.rows[0].id } });
      }
    }

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const isGuide = ['professor', 'super_admin', 'admin'].includes(req.user.role);
    const result = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS created_by_name,
              COALESCE(sub.submission_count, 0) AS submission_count
       FROM assignments a
       JOIN users u ON a.created_by = u.id
       LEFT JOIN (SELECT assignment_id, COUNT(*) AS submission_count FROM assignment_submissions GROUP BY assignment_id) sub ON a.id = sub.assignment_id
       WHERE ${isGuide ? 'a.created_by = $1' : 'a.is_published = TRUE AND a.available_from <= NOW()'}
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

router.post('/:id/submit', async (req, res, next) => {
  try {
    const { content, fileUrls } = req.body;
    const assignment = await query(`SELECT * FROM assignments WHERE id = $1`, [req.params.id]);
    if (!assignment.rows.length) throw new AppError('Assignment not found', 404);

    const a = assignment.rows[0];
    const isLate = a.due_date && new Date() > new Date(a.due_date);
    if (isLate && !a.allow_late_submission) throw new AppError('Submission deadline has passed', 400);

    let plagiarismScore = null;
    if (a.plagiarism_check && content) {
      const pResult = await checkPlagiarism(content);
      plagiarismScore = pResult.riskScore;
    }

    const result = await query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, status, content, file_urls, submitted_at, is_late, plagiarism_score)
       VALUES ($1,$2,'submitted',$3,$4,NOW(),$5,$6)
       ON CONFLICT (assignment_id, student_id) DO UPDATE
         SET content = $3, file_urls = $4, submitted_at = NOW(), is_late = $5, status = 'submitted', plagiarism_score = $6
       RETURNING *`,
      [req.params.id, req.user.id, content, fileUrls, isLate, plagiarismScore]
    );

    await sendNotification({
      userId: a.created_by,
      type: 'submission_received',
      title: 'Assignment Submitted',
      body: `${req.user.first_name} submitted: ${a.title}`,
      data: { assignmentId: req.params.id },
    });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

router.patch('/:id/submissions/:submissionId/grade', authorize('professor', 'super_admin', 'admin'), async (req, res, next) => {
  try {
    const { marksObtained, feedback, rubricScores } = req.body;

    const result = await query(
      `UPDATE assignment_submissions SET
         marks_obtained = $1, feedback = $2, rubric_scores = $3,
         status = 'graded', graded_by = $4, graded_at = NOW()
       WHERE id = $5 RETURNING *, student_id`,
      [marksObtained, feedback, JSON.stringify(rubricScores), req.user.id, req.params.submissionId]
    );

    await sendNotification({
      userId: result.rows[0].student_id,
      type: 'grade_published',
      title: 'Assignment Graded',
      body: `Your assignment has been graded. Score: ${marksObtained}`,
      data: { assignmentId: req.params.id },
    });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
