'use strict';

const jwt = require('jsonwebtoken');
const { getRedis } = require('../config/redis');
const logger = require('../utils/logger');
const { Message, Conversation } = require('../models/chat/Message');

const onlineUsers = new Map(); // userId -> Set of socketIds

const initSocketHandlers = (io) => {
  // JWT authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`Socket connected: ${socket.id} (user: ${userId})`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join personal room
    socket.join(`user:${userId}`);

    // Broadcast online status
    io.emit('user:online', { userId, timestamp: new Date() });

    // ── Chat Events ──────────────────────────────────────────

    socket.on('chat:join', async ({ conversationId }) => {
      socket.join(`chat:${conversationId}`);
      logger.debug(`User ${userId} joined chat: ${conversationId}`);
    });

    socket.on('chat:leave', ({ conversationId }) => {
      socket.leave(`chat:${conversationId}`);
    });

    socket.on('chat:message', async (data) => {
      try {
        const { conversationId, content, type, fileUrl, replyToId } = data;

        const message = await Message.create({
          conversationId,
          senderId: userId,
          content,
          type: type || 'text',
          fileUrl,
          replyToId,
          readBy: [{ userId, readAt: new Date() }],
        });

        // Update conversation last message
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id,
          updatedAt: new Date(),
          $inc: { [`unreadCounts.${conversationId}`]: 1 },
        });

        // Emit to conversation room
        io.to(`chat:${conversationId}`).emit('chat:message:new', {
          ...message.toObject(),
          conversationId,
        });

        // Push notification to offline participants
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          conversation.participants.forEach((participantId) => {
            if (participantId.toString() !== userId && !onlineUsers.has(participantId.toString())) {
              // User is offline — will receive push notification via service
            }
          });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
        logger.error('Chat message error:', err);
      }
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      socket.to(`chat:${conversationId}`).emit('chat:typing', {
        userId,
        conversationId,
        isTyping,
      });
    });

    socket.on('chat:read', async ({ conversationId, messageId }) => {
      try {
        await Message.updateMany(
          { conversationId, 'readBy.userId': { $ne: userId } },
          { $push: { readBy: { userId, readAt: new Date() } } }
        );
        io.to(`chat:${conversationId}`).emit('chat:read:receipt', { userId, conversationId });
      } catch (err) {
        logger.error('Read receipt error:', err);
      }
    });

    socket.on('chat:react', async ({ messageId, emoji }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          {
            $pull: { reactions: { userId } },
          },
          { new: true }
        );
        await Message.findByIdAndUpdate(
          messageId,
          { $push: { reactions: { userId, emoji, createdAt: new Date() } } },
          { new: true }
        );
        io.to(`chat:${message.conversationId}`).emit('chat:reacted', { messageId, userId, emoji });
      } catch (err) {
        logger.error('Reaction error:', err);
      }
    });

    // ── Notifications ────────────────────────────────────────

    socket.on('notification:subscribe', () => {
      socket.join(`notifications:${userId}`);
    });

    // ── Research Updates ─────────────────────────────────────

    socket.on('research:join', ({ projectId }) => {
      socket.join(`research:${projectId}`);
    });

    socket.on('research:progress:update', (data) => {
      socket.to(`research:${data.projectId}`).emit('research:progress:updated', {
        ...data,
        updatedBy: userId,
        timestamp: new Date(),
      });
    });

    // ── Video Meeting ────────────────────────────────────────

    socket.on('meeting:join', ({ meetingId }) => {
      socket.join(`meeting:${meetingId}`);
      socket.to(`meeting:${meetingId}`).emit('meeting:participant:joined', {
        userId,
        socketId: socket.id,
      });
    });

    socket.on('meeting:leave', ({ meetingId }) => {
      socket.leave(`meeting:${meetingId}`);
      socket.to(`meeting:${meetingId}`).emit('meeting:participant:left', { userId });
    });

    socket.on('meeting:signal', ({ meetingId, targetId, signal }) => {
      io.to(`user:${targetId}`).emit('meeting:signal', {
        fromId: userId,
        signal,
        meetingId,
      });
    });

    // ── Disconnect ───────────────────────────────────────────

    socket.on('disconnect', () => {
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId, timestamp: new Date() });
        }
      }
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('✅ Socket.IO handlers initialized');
};

const getOnlineUsers = () => [...onlineUsers.keys()];
const isUserOnline = (userId) => onlineUsers.has(userId);
const emitToUser = (io, userId, event, data) => io.to(`user:${userId}`).emit(event, data);

module.exports = { initSocketHandlers, getOnlineUsers, isUserOnline, emitToUser };
