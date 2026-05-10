'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { academicAssistantChat, generateGoalsFromObjective, checkPlagiarism } = require('../services/aiService');
const { getCache, setCache } = require('../config/redis');

router.use(authenticate);

// AI Academic Assistant
router.post('/assistant', async (req, res, next) => {
  try {
    const { message, conversationHistory, context } = req.body;

    const response = await academicAssistantChat({
      userMessage: message,
      conversationHistory,
      context: { userRole: req.user.role, ...context },
    });

    res.json({ success: true, data: { response } });
  } catch (err) { next(err); }
});

// AI Goal Generation
router.post('/generate-goals', async (req, res, next) => {
  try {
    const { researchTitle, researchType, duration } = req.body;
    const cacheKey = `ai:goals:${Buffer.from(researchTitle).toString('base64').slice(0, 20)}`;

    let data = await getCache(cacheKey);
    if (!data) {
      data = await generateGoalsFromObjective({ researchTitle, researchType, duration });
      await setCache(cacheKey, data, 3600);
    }

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// AI Plagiarism Check
router.post('/plagiarism-check', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || text.length < 100) {
      return res.status(400).json({ success: false, message: 'Text too short for analysis' });
    }
    const result = await checkPlagiarism(text);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// AI Writing Assistance
router.post('/writing-assist', async (req, res, next) => {
  try {
    const { text, task } = req.body;
    const { academicAssistantChat: chat } = require('../services/aiService');

    const prompts = {
      improve: `Improve the academic writing quality of this text while maintaining the original meaning: ${text}`,
      abstract: `Write a comprehensive academic abstract for this research content: ${text}`,
      citations: `Suggest appropriate citation format improvements for: ${text}`,
      grammar: `Correct grammar and academic style for: ${text}`,
    };

    const response = await chat({ userMessage: prompts[task] || prompts.improve });
    res.json({ success: true, data: { improved: response } });
  } catch (err) { next(err); }
});

module.exports = router;
