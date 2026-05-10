'use strict';

const { query } = require('../config/database');
const AppError = require('../utils/AppError');
const { sendNotification } = require('../services/notificationService');
const { deleteCache } = require('../config/redis');

exports.createGoal = async (req, res, next) => {
  try {
    const {
      projectId, groupId, assignedTo, title, description,
      category, priority, startDate, dueDate, milestones,
      isRecurring, recurrencePattern, resources, tags, reminderDays,
    } = req.body;

    const result = await query(
      `INSERT INTO goals
       (project_id, group_id, created_by, assigned_to, title, description,
        category, priority, start_date, due_date, is_recurring, recurrence_pattern,
        resources, tags, reminder_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        projectId, groupId, req.user.id, assignedTo, title, description,
        category, priority || 'medium', startDate, dueDate,
        isRecurring || false, recurrencePattern, resources, tags,
        reminderDays || [1, 3, 7],
      ]
    );

    const goal = result.rows[0];

    // Create milestones if provided
    if (milestones?.length) {
      for (let i = 0; i < milestones.length; i++) {
        await query(
          `INSERT INTO goal_milestones (goal_id, title, description, order_index, due_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [goal.id, milestones[i].title, milestones[i].description, i, milestones[i].dueDate]
        );
      }
    }

    // Notify the assigned user
    if (assignedTo !== req.user.id) {
      const assignerName = `${req.user.first_name} ${req.user.last_name}`;
      await sendNotification({
        userId: assignedTo,
        type: 'task_assigned',
        title: 'New Goal Assigned',
        body: `${assignerName} assigned you a new goal: ${title}`,
        data: { goalId: goal.id, dueDate },
      });
    }

    res.status(201).json({ success: true, data: goal });
  } catch (err) {
    next(err);
  }
};

exports.getGoals = async (req, res, next) => {
  try {
    const { projectId, assignedTo, status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];

    const isGuide = ['professor', 'super_admin', 'admin'].includes(req.user.role);
    if (isGuide) {
      conditions.push(`g.created_by = $${params.length + 1}`);
      params.push(req.user.id);
    } else {
      conditions.push(`g.assigned_to = $${params.length + 1}`);
      params.push(req.user.id);
    }

    if (projectId) { conditions.push(`g.project_id = $${params.length + 1}`); params.push(projectId); }
    if (assignedTo) { conditions.push(`g.assigned_to = $${params.length + 1}`); params.push(assignedTo); }
    if (status) { conditions.push(`g.status = $${params.length + 1}`); params.push(status); }
    if (priority) { conditions.push(`g.priority = $${params.length + 1}`); params.push(priority); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT g.*,
              u_assigned.first_name || ' ' || u_assigned.last_name AS assigned_to_name,
              u_assigned.avatar_url AS assigned_to_avatar,
              u_creator.first_name || ' ' || u_creator.last_name AS created_by_name,
              COALESCE(m.milestone_count, 0) AS milestone_count,
              COALESCE(m.completed_milestones, 0) AS completed_milestones,
              COUNT(*) OVER() AS total_count
       FROM goals g
       JOIN users u_assigned ON g.assigned_to = u_assigned.id
       JOIN users u_creator ON g.created_by = u_creator.id
       LEFT JOIN (
         SELECT goal_id,
                COUNT(*) AS milestone_count,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed_milestones
         FROM goal_milestones GROUP BY goal_id
       ) m ON g.id = m.goal_id
       ${whereClause}
       ORDER BY g.priority DESC, g.due_date ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const total = result.rows[0]?.total_count || 0;
    res.json({
      success: true,
      data: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: parseInt(total) },
    });
  } catch (err) {
    next(err);
  }
};

exports.getGoalById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [goalResult, milestonesResult, updatesResult] = await Promise.all([
      query(
        `SELECT g.*,
                u_assigned.first_name || ' ' || u_assigned.last_name AS assigned_to_name,
                u_creator.first_name || ' ' || u_creator.last_name AS created_by_name
         FROM goals g
         JOIN users u_assigned ON g.assigned_to = u_assigned.id
         JOIN users u_creator ON g.created_by = u_creator.id
         WHERE g.id = $1`,
        [id]
      ),
      query(
        `SELECT * FROM goal_milestones WHERE goal_id = $1 ORDER BY order_index ASC`,
        [id]
      ),
      query(
        `SELECT gu.*, u.first_name || ' ' || u.last_name AS updated_by_name
         FROM goal_updates gu JOIN users u ON gu.updated_by = u.id
         WHERE gu.goal_id = $1 ORDER BY gu.created_at DESC LIMIT 20`,
        [id]
      ),
    ]);

    if (!goalResult.rows.length) throw new AppError('Goal not found', 404);

    res.json({
      success: true,
      data: {
        ...goalResult.rows[0],
        milestones: milestonesResult.rows,
        updates: updatesResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateGoalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, completionPercentage, remarks, attachments } = req.body;

    const existing = await query(
      `SELECT g.*, u.id AS assignee_id FROM goals g
       JOIN users u ON g.assigned_to = u.id
       WHERE g.id = $1`,
      [id]
    );
    if (!existing.rows.length) throw new AppError('Goal not found', 404);

    const goal = existing.rows[0];
    const canUpdate = goal.assigned_to === req.user.id ||
      goal.created_by === req.user.id ||
      ['super_admin', 'admin'].includes(req.user.role);

    if (!canUpdate) throw new AppError('Unauthorized to update this goal', 403);

    const completedAt = status === 'completed' ? 'NOW()' : 'NULL';

    const result = await query(
      `UPDATE goals SET
         status = $1,
         completion_percentage = COALESCE($2, completion_percentage),
         remarks = COALESCE($3, remarks),
         attachments = COALESCE($4, attachments),
         completed_at = ${completedAt},
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, completionPercentage, remarks, attachments, id]
    );

    // Log the update
    await query(
      `INSERT INTO goal_updates (goal_id, updated_by, old_status, new_status, old_percentage, new_percentage, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, req.user.id, goal.status, status, goal.completion_percentage, completionPercentage, remarks]
    );

    // Notify guide if student updated
    if (req.user.id === goal.assigned_to) {
      await sendNotification({
        userId: goal.created_by,
        type: 'submission_received',
        title: 'Goal Status Updated',
        body: `Student updated goal "${goal.title}" to: ${status}`,
        data: { goalId: id },
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateMilestone = async (req, res, next) => {
  try {
    const { milestoneId } = req.params;
    const { status, completionPercentage, remarks } = req.body;

    const result = await query(
      `UPDATE goal_milestones SET
         status = $1,
         completion_percentage = COALESCE($2, completion_percentage),
         remarks = COALESCE($3, remarks),
         completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END
       WHERE id = $4
       RETURNING *, goal_id`,
      [status, completionPercentage, remarks, milestoneId]
    );
    if (!result.rows.length) throw new AppError('Milestone not found', 404);

    // Recalculate goal completion percentage
    const goalId = result.rows[0].goal_id;
    const stats = await query(
      `SELECT
         AVG(completion_percentage) AS avg_completion,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) AS total
       FROM goal_milestones WHERE goal_id = $1`,
      [goalId]
    );

    const avgCompletion = Math.round(stats.rows[0].avg_completion || 0);
    const allCompleted = stats.rows[0].completed === stats.rows[0].total;

    await query(
      `UPDATE goals SET completion_percentage = $1, status = $2 WHERE id = $3`,
      [avgCompletion, allCompleted ? 'completed' : 'in_progress', goalId]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getBatchProgress = async (req, res, next) => {
  try {
    const { groupId, projectId } = req.query;

    const result = await query(
      `SELECT
         u.id, u.first_name, u.last_name, u.email, u.avatar_url,
         COUNT(g.id) AS total_goals,
         COUNT(g.id) FILTER (WHERE g.status = 'completed') AS completed,
         COUNT(g.id) FILTER (WHERE g.status = 'in_progress') AS in_progress,
         COUNT(g.id) FILTER (WHERE g.status NOT IN ('completed') AND g.due_date < NOW()) AS overdue,
         ROUND(AVG(g.completion_percentage)) AS avg_completion,
         MAX(g.updated_at) AS last_activity
       FROM users u
       LEFT JOIN goals g ON g.assigned_to = u.id
         AND ($1::UUID IS NULL OR g.project_id IN (
           SELECT id FROM research_projects WHERE group_id = $1
         ))
         AND ($2::UUID IS NULL OR EXISTS (
           SELECT 1 FROM research_projects rp
           WHERE rp.id = g.project_id AND rp.id = $2
         ))
       WHERE u.id IN (
         SELECT user_id FROM research_group_members WHERE group_id = $1 AND is_active = TRUE
       )
       GROUP BY u.id, u.first_name, u.last_name, u.email, u.avatar_url
       ORDER BY avg_completion DESC`,
      [groupId || null, projectId || null]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};
