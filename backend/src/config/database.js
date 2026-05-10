'use strict';

const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const connectPostgres = async () => {
  // Railway auto-injects DATABASE_URL when Postgres is in the same project
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    logger.info('Using Railway DATABASE_URL for PostgreSQL');
  } else {
    pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT) || 5432,
      database: process.env.PG_DATABASE || 'academic_platform',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
  }

  pool.on('error', (err) => {
    logger.error('Unexpected PostgreSQL client error:', err);
  });

  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();
  logger.info('✅ PostgreSQL connected successfully');
};

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow query detected (${duration}ms): ${text.substring(0, 80)}`);
    }
    return result;
  } catch (err) {
    logger.error('Database query error:', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
};

const getClient = () => pool.connect();

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { connectPostgres, query, getClient, transaction };
