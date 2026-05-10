'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;
let useInMemory = false;

// In-memory fallback cache when Redis is unavailable
const memCache = new Map();

const connectRedis = async () => {
  const host = process.env.REDIS_HOST;

  if (!host || host.includes('YOUR_UPSTASH')) {
    logger.warn('⚠️  REDIS_HOST not configured — using in-memory cache (sessions will reset on restart)');
    useInMemory = true;
    return;
  }

  try {
    redisClient = new Redis({
      host,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    redisClient.on('connect', () => logger.info('✅ Redis connected'));
    redisClient.on('error', (err) => {
      logger.warn(`⚠️  Redis error (falling back to memory): ${err.message}`);
      useInMemory = true;
    });

    await redisClient.connect();
    await redisClient.ping();
    useInMemory = false;
  } catch (err) {
    logger.warn(`⚠️  Redis unavailable (using in-memory cache): ${err.message}`);
    redisClient = null;
    useInMemory = true;
  }
};

const getRedis = () => redisClient;

const setCache = async (key, value, ttlSeconds = 3600) => {
  if (redisClient && !useInMemory) {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } else {
    memCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }
};

const getCache = async (key) => {
  if (redisClient && !useInMemory) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }
  const entry = memCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { memCache.delete(key); return null; }
  return entry.value;
};

const deleteCache = async (key) => {
  if (redisClient && !useInMemory) await redisClient.del(key);
  else memCache.delete(key);
};

const deleteCachePattern = async (pattern) => {
  if (redisClient && !useInMemory) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(...keys);
  } else {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of memCache.keys()) {
      if (regex.test(key)) memCache.delete(key);
    }
  }
};

module.exports = { connectRedis, getRedis, setCache, getCache, deleteCache, deleteCachePattern };
