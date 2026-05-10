'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { Message, Conversation } = require('../models/chat/Message');
const AppError = require('../utils/AppError');
const { summarizeDiscussion } = require('../services/aiService');

router.use(authenticate);

// Get or create direct conversation
router.post('/conversations/direct', async (req, res, next) => {
  try {
    const { participantId } = req.body;
    const myId = req.user.id;

    let conv = await Conversation.findOne({
      type: 'direct',
      'participants.userId': { $all: [myId, participantId] },
    });

    if (!conv) {
      conv = await Conversation.create({
        type: 'direct',
        participants: [{ userId: myId }, { userId: participantId }],
        createdBy: myId,
      });
    }

    res.json({ success: true, data: conv });
  } catch (err) { next(err); }
});

// Create group conversation
router.post('/conversations/group', async (req, res, next) => {
  try {
    const { name, participantIds, description, relatedId, relatedType } = req.body;
    const participants = [req.user.id, ...participantIds].map((id) => ({
      userId: id,
      role: id === req.user.id ? 'admin' : 'member',
    }));

    const conv = await Conversation.create({
      type: 'group',
      name,
      description,
      participants,
      createdBy: req.user.id,
      relatedId,
      relatedType,
    });

    res.status(201).json({ success: true, data: conv });
  } catch (err) { next(err); }
});

// Get my conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;

    const conversations = await Conversation.find({
      'participants.userId': req.user.id,
      'participants.isActive': true,
      isActive: true,
    })
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({ success: true, data: conversations });
  } catch (err) { next(err); }
});

// Get messages in a conversation
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    const filter = { conversationId: id, isDeleted: false };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: messages.reverse() });
  } catch (err) { next(err); }
});

// Send message via REST (fallback for non-socket clients)
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const { content, type, fileUrl, fileName, fileSize } = req.body;

    const message = await Message.create({
      conversationId: req.params.id,
      senderId: req.user.id,
      type: type || 'text',
      content,
      fileUrl,
      fileName,
      fileSize,
    });

    await Conversation.findByIdAndUpdate(req.params.id, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${req.params.id}`).emit('chat:message:new', message.toObject());
    }

    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
});

// Pin message
router.patch('/messages/:id/pin', async (req, res, next) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { isPinned: true, pinnedAt: new Date(), pinnedBy: req.user.id },
      { new: true }
    );
    res.json({ success: true, data: message });
  } catch (err) { next(err); }
});

// Delete message
router.delete('/messages/:id', async (req, res, next) => {
  try {
    await Message.findByIdAndUpdate(req.params.id, {
      isDeleted: true, deletedAt: new Date(), content: 'This message was deleted',
    });
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) { next(err); }
});

// AI Summary of conversation
router.post('/conversations/:id/summarize', async (req, res, next) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.id,
      type: 'text',
      isDeleted: false,
    }).sort({ createdAt: -1 }).limit(100);

    const summary = await summarizeDiscussion(messages.map((m) => ({
      senderName: m.senderId,
      content: m.content,
    })));

    res.json({ success: true, data: { summary } });
  } catch (err) { next(err); }
});

module.exports = router;
