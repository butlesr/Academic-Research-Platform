'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let mongoConnected = false;

const connectMongo = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('USERNAME:PASSWORD')) {
    logger.warn('⚠️  MONGO_URI not configured — chat features will be disabled');
    return;
  }

  try {
    mongoose.connection.on('connected', () => {
      mongoConnected = true;
      logger.info('✅ MongoDB connected');
    });
    mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err.message));
    mongoose.connection.on('disconnected', () => {
      mongoConnected = false;
      logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    mongoConnected = true;
  } catch (err) {
    logger.warn(`⚠️  MongoDB connection failed (chat disabled): ${err.message}`);
  }
};

const isMongoConnected = () => mongoConnected;

module.exports = { connectMongo, isMongoConnected };
