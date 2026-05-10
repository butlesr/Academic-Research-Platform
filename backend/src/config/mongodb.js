'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectMongo = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/academic_chat';

  mongoose.connection.on('connected', () => logger.info('✅ MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};

module.exports = { connectMongo };
