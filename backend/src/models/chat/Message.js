'use strict';

const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const readReceiptSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  readAt: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'voice_note', 'system', 'announcement'],
      default: 'text',
    },
    content: { type: String, maxlength: 10000 },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    fileMimeType: String,
    thumbnailUrl: String,
    duration: Number,
    replyToId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    forwardedFrom: String,
    reactions: [reactionSchema],
    readBy: [readReceiptSchema],
    isPinned: { type: Boolean, default: false },
    pinnedAt: Date,
    pinnedBy: String,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    editedAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, isPinned: 1 });

const participantSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  mutedUntil: Date,
  isActive: { type: Boolean, default: true },
});

const conversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'research_group', 'announcement', 'broadcast'],
      required: true,
    },
    name: String,
    description: String,
    avatarUrl: String,
    participants: [participantSchema],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    lastMessageAt: Date,
    createdBy: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
    relatedId: String,
    relatedType: String,
  },
  { timestamps: true }
);

conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ type: 1, isActive: 1 });

const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = { Message, Conversation };
