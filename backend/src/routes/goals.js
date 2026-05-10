'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const goalController = require('../controllers/goalController');

router.use(authenticate);

router.post('/', authorize('professor', 'super_admin', 'admin'), goalController.createGoal);
router.get('/', goalController.getGoals);
router.get('/batch-progress', authorize('professor', 'super_admin', 'admin'), goalController.getBatchProgress);
router.get('/:id', goalController.getGoalById);
router.patch('/:id/status', goalController.updateGoalStatus);
router.patch('/milestones/:milestoneId', goalController.updateMilestone);

module.exports = router;
