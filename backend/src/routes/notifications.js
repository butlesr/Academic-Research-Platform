'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { query } = require('../config/database');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT n.*,
              u.first_name || ' ' || u.last_name AS sender_name,
              u.avatar_url AS sender_avatar,
              COUNT(*) OVER() AS total_count
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.id
       WHERE n.user_id = $1
         AND ($2::boolean IS NULL OR n.is_read = NOT $2)
         AND (n.expires_at IS NULL OR n.expires_at > NOW())
       ORDER BY n.created_at DESC
       LIMIT $3 OFFSET $4`,
      [req.user.id, unread === 'true' ? true : null, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: { page: parseInt(page), total: parseInt(result.rows[0]?.total_count || 0) },
    });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/mark-all-read', async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [req.user.id]
    );
    res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
  } catch (err) { next(err); }
});

module.exports = router;
