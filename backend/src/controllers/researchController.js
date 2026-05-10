'use strict';

const { query, transaction } = require('../config/database');
const { setCache, getCache, deleteCache } = require('../config/redis');
const AppError = require('../utils/AppError');
const { generateAIInsights } = require('../services/aiService');
const { sendNotification } = require('../services/notificationService');

// ── Research Groups ──────────────────────────────────────────

exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, researchDomain, departmentId } = req.body;

    const result = await query(
      `INSERT INTO research_groups (institution_id, department_id, guide_id, name, description, research_domain)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.institution_id, departmentId, req.user.id, name, description, researchDomain]
    );

    // Auto-add guide as group member
    await query(
      `INSERT INTO research_group_members (group_id, user_id, role) VALUES ($1, $2, 'guide')`,
      [result.rows[0].id, req.user.id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getMyGroups = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rg.*,
              COUNT(DISTINCT rgm.user_id) FILTER (WHERE rgm.is_active) AS member_count,
              COUNT(DISTINCT rp.id) AS project_count
       FROM research_groups rg
       LEFT JOIN research_group_members rgm ON rg.id = rgm.group_id
       LEFT JOIN research_projects rp ON rg.id = rp.group_id
       WHERE rg.guide_id = $1 AND rg.is_active = TRUE
       GROUP BY rg.id
       ORDER BY rg.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

exports.addGroupMember = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { userId, role } = req.body;

    const group = await query(
      `SELECT * FROM research_groups WHERE id = $1 AND guide_id = $2`,
      [groupId, req.user.id]
    );
    if (!group.rows.length) throw new AppError('Group not found or unauthorized', 404);

    await query(
      `INSERT INTO research_group_members (group_id, user_id, role)
       VALUES ($1, $2, $3) ON CONFLICT (group_id, user_id) DO UPDATE SET is_active = TRUE, role = $3`,
      [groupId, userId, role || 'member']
    );

    const userInfo = await query(`SELECT first_name, last_name FROM users WHERE id = $1`, [userId]);
    await sendNotification({
      userId,
      type: 'system',
      title: 'Added to Research Group',
      body: `You have been added to research group: ${group.rows[0].name}`,
      data: { groupId },
    });

    res.json({ success: true, message: 'Member added successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Research Projects ────────────────────────────────────────

exports.createProject = async (req, res, next) => {
  try {
    const {
      scholarId, groupId, title, abstract, type,
      startDate, expectedEndDate, keywords, domain,
      registrationNumber, coGuideId,
    } = req.body;

    const result = await query(
      `INSERT INTO research_projects
       (institution_id, department_id, group_id, scholar_id, guide_id, co_guide_id,
        title, abstract, type, start_date, expected_end_date, keywords, domain, registration_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.institution_id, req.user.department_id, groupId,
        scholarId, req.user.id, coGuideId,
        title, abstract, type, startDate, expectedEndDate,
        keywords, domain, registrationNumber,
      ]
    );

    await sendNotification({
      userId: scholarId,
      type: 'task_assigned',
      title: 'New Research Project Assigned',
      body: `Your guide has created a research project: ${title}`,
      data: { projectId: result.rows[0].id },
    });

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '';
    const params = [req.user.id, limit, offset];

    const roleClause = ['professor', 'super_admin', 'admin'].includes(req.user.role)
      ? 'rp.guide_id = $1'
      : 'rp.scholar_id = $1';

    if (status) { whereClause += ` AND rp.status = $${params.length + 1}`; params.push(status); }
    if (type) { whereClause += ` AND rp.type = $${params.length + 1}`; params.push(type); }

    const result = await query(
      `SELECT rp.*,
              u_scholar.first_name || ' ' || u_scholar.last_name AS scholar_name,
              u_scholar.email AS scholar_email,
              u_scholar.avatar_url AS scholar_avatar,
              u_guide.first_name || ' ' || u_guide.last_name AS guide_name,
              COUNT(*) OVER() AS total_count
       FROM research_projects rp
       JOIN users u_scholar ON rp.scholar_id = u_scholar.id
       JOIN users u_guide ON rp.guide_id = u_guide.id
       WHERE ${roleClause} ${whereClause}
       ORDER BY rp.created_at DESC
       LIMIT $2 OFFSET $3`,
      params
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

exports.getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cacheKey = `project:${id}`;
    let data = await getCache(cacheKey);

    if (!data) {
      const result = await query(
        `SELECT rp.*,
                u_scholar.first_name || ' ' || u_scholar.last_name AS scholar_name,
                u_scholar.email AS scholar_email,
                u_scholar.avatar_url AS scholar_avatar,
                u_scholar.phone AS scholar_phone,
                u_guide.first_name || ' ' || u_guide.last_name AS guide_name,
                u_guide.email AS guide_email,
                d.name AS department_name,
                rg.name AS group_name
         FROM research_projects rp
         JOIN users u_scholar ON rp.scholar_id = u_scholar.id
         JOIN users u_guide ON rp.guide_id = u_guide.id
         LEFT JOIN departments d ON rp.department_id = d.id
         LEFT JOIN research_groups rg ON rp.group_id = rg.id
         WHERE rp.id = $1`,
        [id]
      );
      if (!result.rows.length) throw new AppError('Project not found', 404);

      // Fetch goals count
      const goalsResult = await query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'completed') AS completed
         FROM goals WHERE project_id = $1`,
        [id]
      );

      // Fetch publications
      const pubResult = await query(
        `SELECT COUNT(*) AS total FROM publications WHERE project_id = $1`,
        [id]
      );

      data = {
        ...result.rows[0],
        goals_stats: goalsResult.rows[0],
        publications_count: parseInt(pubResult.rows[0].total),
      };
      await setCache(cacheKey, data, 120);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateProjectProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completionPercentage, status, remarks } = req.body;

    const result = await query(
      `UPDATE research_projects
       SET completion_percentage = $1, status = COALESCE($2, status), updated_at = NOW()
       WHERE id = $3 AND (guide_id = $4 OR scholar_id = $4)
       RETURNING *`,
      [completionPercentage, status, id, req.user.id]
    );
    if (!result.rows.length) throw new AppError('Project not found or unauthorized', 404);

    // Log activity
    await query(
      `INSERT INTO research_activities (project_id, user_id, type, title, description)
       VALUES ($1, $2, 'progress_update', 'Progress Updated', $3)`,
      [id, req.user.id, remarks || `Progress updated to ${completionPercentage}%`]
    );

    await deleteCache(`project:${id}`);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getScholarDashboard = async (req, res, next) => {
  try {
    const scholarId = req.params.scholarId || req.user.id;

    const [projects, goals, attendance, publications, recentActivity] = await Promise.all([
      query(
        `SELECT rp.id, rp.title, rp.type, rp.status, rp.completion_percentage,
                rp.expected_end_date, rp.start_date
         FROM research_projects rp WHERE rp.scholar_id = $1 ORDER BY rp.created_at DESC`,
        [scholarId]
      ),
      query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'completed') AS completed,
           COUNT(*) FILTER (WHERE status IN ('not_started', 'in_progress') AND due_date < NOW()) AS overdue,
           COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress
         FROM goals WHERE assigned_to = $1`,
        [scholarId]
      ),
      query(
        `SELECT
           COUNT(*) AS total_classes,
           COUNT(*) FILTER (WHERE status = 'present') AS present,
           COUNT(*) FILTER (WHERE status = 'absent') AS absent
         FROM attendance_records WHERE user_id = $1`,
        [scholarId]
      ),
      query(`SELECT COUNT(*) AS total FROM publications WHERE scholar_id = $1`, [scholarId]),
      query(
        `SELECT type, title, created_at FROM research_activities
         WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [scholarId]
      ),
    ]);

    const attendanceRate = attendance.rows[0].total_classes > 0
      ? Math.round((attendance.rows[0].present / attendance.rows[0].total_classes) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        projects: projects.rows,
        goals: goals.rows[0],
        attendance: { ...attendance.rows[0], rate: attendanceRate },
        publications: parseInt(publications.rows[0].total),
        recentActivity: recentActivity.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getGuideOverview = async (req, res, next) => {
  try {
    const guideId = req.user.id;

    const [scholars, projects, pendingGoals, upcomingMeetings] = await Promise.all([
      query(
        `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.avatar_url,
                rp.completion_percentage, rp.type, rp.title AS project_title,
                rp.expected_end_date
         FROM users u
         JOIN research_projects rp ON rp.scholar_id = u.id
         WHERE rp.guide_id = $1 AND rp.status = 'active'
         ORDER BY rp.expected_end_date ASC`,
        [guideId]
      ),
      query(
        `SELECT status, COUNT(*) AS count FROM research_projects
         WHERE guide_id = $1 GROUP BY status`,
        [guideId]
      ),
      query(
        `SELECT g.*, u.first_name || ' ' || u.last_name AS scholar_name
         FROM goals g JOIN users u ON g.assigned_to = u.id
         WHERE g.created_by = $1 AND g.status NOT IN ('completed', 'approved')
           AND g.due_date < NOW() + INTERVAL '7 days'
         ORDER BY g.due_date ASC LIMIT 20`,
        [guideId]
      ),
      query(
        `SELECT m.*, COUNT(mp.user_id) AS participant_count
         FROM meetings m
         LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
         WHERE m.organized_by = $1 AND m.scheduled_at > NOW() AND m.status = 'scheduled'
         GROUP BY m.id ORDER BY m.scheduled_at ASC LIMIT 5`,
        [guideId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        scholars: scholars.rows,
        projectStats: projects.rows,
        pendingGoals: pendingGoals.rows,
        upcomingMeetings: upcomingMeetings.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAIProjectInsights = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await query(
      `SELECT rp.*, u.first_name || ' ' || u.last_name AS scholar_name
       FROM research_projects rp JOIN users u ON rp.scholar_id = u.id
       WHERE rp.id = $1 AND (rp.guide_id = $2 OR rp.scholar_id = $2)`,
      [id, req.user.id]
    );
    if (!project.rows.length) throw new AppError('Project not found', 404);

    const goals = await query(
      `SELECT title, status, completion_percentage, due_date FROM goals
       WHERE project_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    const insights = await generateAIInsights({
      project: project.rows[0],
      goals: goals.rows,
    });

    await query(
      `UPDATE research_projects SET ai_insights = $1 WHERE id = $2`,
      [JSON.stringify(insights), id]
    );

    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
};
