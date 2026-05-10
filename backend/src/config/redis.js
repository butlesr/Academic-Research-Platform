'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  redisClient.on('connect', () => logger.info('✅ Redis connected'));
  redisClient.on('error', (err) => logger.error('Redis error:', err.message));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  await redisClient.ping();
  return redisClient;
};

const getRedis = () => {
  if (!redisClient) throw new Error('Redis not connected');
  return redisClient;
};

const setCache = async (key, value, ttlSeconds = 3600) => {
  const client = getRedis();
  await client.setex(key, ttlSeconds, JSON.stringify(value));
};

const getCache = async (key) => {
  const client = getRedis();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
};

const deleteCache = async (key) => {
  const client = getRedis();
  await client.del(key);
};

const deleteCachePattern = async (pattern) => {
  const client = getRedis();
  const keys = await client.keys(pattern);
  if (keys.length > 0) await client.del(...keys);
};

module.exports = { connectRedis, getRedis, setCache, getCache, deleteCache, deleteCachePattern };
