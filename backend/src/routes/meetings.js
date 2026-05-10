'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/database');
const { sendNotification } = require('../services/notificationService');
const { v4: uuidv4 } = require('uuid');

router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    const { title, agenda, type, platform, scheduledAt, durationMinutes, participantIds, researchProjectId, researchGroupId, courseId, isRecurring, recurrencePattern } = req.body;

    const meetingId = uuidv4().slice(0, 12);
    const meetingUrl = platform === 'jitsi'
      ? `https://meet.jit.si/academic-${meetingId}`
      : `${process.env.FRONTEND_URL}/meetings/${meetingId}`;

    const result = await query(
      `INSERT INTO meetings (organized_by, research_project_id, research_group_id, course_id, title, agenda, type, platform, meeting_url, meeting_id, scheduled_at, duration_minutes, is_recurring, recurrence_pattern)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.id, researchProjectId, researchGroupId, courseId, title, agenda, type || 'online', platform || 'jitsi', meetingUrl, meetingId, scheduledAt, durationMinutes || 60, isRecurring || false, recurrencePattern]
    );

    const meeting = result.rows[0];
    const allParticipants = [req.user.id, ...(participantIds || [])];

    for (const userId of allParticipants) {
      await query(
        `INSERT INTO meeting_participants (meeting_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [meeting.id, userId, userId === req.user.id ? 'host' : 'participant']
      );
      if (userId !== req.user.id) {
        await sendNotification({
          userId,
          type: 'meeting_scheduled',
          title: 'Meeting Scheduled',
          body: `${req.user.first_name} scheduled a meeting: ${title} on ${new Date(scheduledAt).toLocaleString()}`,
          data: { meetingId: meeting.id, meetingUrl },
        });
      }
    }

    res.status(201).json({ success: true, data: meeting });
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.*, u.first_name || ' ' || u.last_name AS organizer_name,
              COUNT(mp.user_id) AS participant_count,
              mp2.attendance_status AS my_status
       FROM meetings m
       JOIN users u ON m.organized_by = u.id
       JOIN meeting_participants mp ON m.id = mp.meeting_id
       JOIN meeting_participants mp2 ON m.id = mp2.meeting_id AND mp2.user_id = $1
       WHERE mp2.user_id = $1 AND m.status != 'cancelled'
       GROUP BY m.id, u.first_name, u.last_name, mp2.attendance_status
       ORDER BY m.scheduled_at ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

router.patch('/:id/join', async (req, res, next) => {
  try {
    await query(
      `UPDATE meeting_participants SET joined_at = NOW(), attendance_status = 'attended' WHERE meeting_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    const meeting = await query(`SELECT meeting_url FROM meetings WHERE id = $1`, [req.params.id]);
    res.json({ success: true, data: { meetingUrl: meeting.rows[0]?.meeting_url } });
  } catch (err) { next(err); }
});

module.exports = router;
