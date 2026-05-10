'use strict';

const fs = require('fs');
const path = require('path');
const { query } = require('./database');
const logger = require('../utils/logger');

const runMigrations = async () => {
  try {
    // Check if schema is already applied
    const result = await query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (parseInt(result.rows[0].count) > 0) {
      logger.info('✅ Database schema already exists — skipping migration');
      return;
    }

    logger.info('🔧 Running database schema migration...');

    // Read schema file
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      logger.warn('Schema file not found at ' + schemaPath + ' — skipping auto-migration');
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Run schema
    await query(schema);
    logger.info('✅ Database schema applied successfully — all tables created');

  } catch (err) {
    logger.error('❌ Migration error:', err.message);
    // Don't throw — let the app start anyway and log the error
  }
};

module.exports = { runMigrations };
