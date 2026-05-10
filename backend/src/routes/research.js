'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const researchController = require('../controllers/researchController');

router.use(authenticate);

// Research Groups
router.post('/groups', authorize('professor', 'super_admin', 'admin'), researchController.createGroup);
router.get('/groups', researchController.getMyGroups);
router.post('/groups/:groupId/members', authorize('professor', 'super_admin', 'admin'), researchController.addGroupMember);

// Research Projects
router.post('/projects', authorize('professor', 'super_admin', 'admin'), researchController.createProject);
router.get('/projects', researchController.getProjects);
router.get('/projects/:id', researchController.getProjectById);
router.patch('/projects/:id/progress', researchController.updateProjectProgress);
router.get('/projects/:id/ai-insights', researchController.getAIProjectInsights);

// Dashboards
router.get('/dashboard/scholar/:scholarId?', researchController.getScholarDashboard);
router.get('/dashboard/guide', authorize('professor', 'super_admin', 'admin'), researchController.getGuideOverview);

module.exports = router;
