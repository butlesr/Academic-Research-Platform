'use strict';

const admin = require('firebase-admin');
const { query } = require('../config/database');
const { sendEmail } = require('./emailService');
const logger = require('../utils/logger');

let firebaseInitialized = false;

const initFirebase = () => {
  if (!firebaseInitialized && process.env.FIREBASE_PROJECT_ID) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      firebaseInitialized = true;
      logger.info('✅ Firebase Admin initialized');
    } catch (err) {
      logger.warn('Firebase initialization failed:', err.message);
    }
  }
};

initFirebase();

const sendNotification = async ({ userId, type, title, body, data = {}, sendPush = true }) => {
  try {
    // Store in-app notification
    await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, body, JSON.stringify(data)]
    );

    // Get user preferences and FCM token
    const userResult = await query(
      `SELECT notification_preferences, fcm_token, email FROM users WHERE id = $1`,
      [userId]
    );

    if (!userResult.rows.length) return;
    const user = userResult.rows[0];
    const prefs = user.notification_preferences || {};

    // Send push notification
    if (sendPush && prefs.push && user.fcm_token && firebaseInitialized) {
      try {
        await admin.messaging().send({
          token: user.fcm_token,
          notification: { title, body },
          data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
          android: { priority: 'high', notification: { sound: 'default' } },
          apns: { payload: { aps: { sound: 'default', badge: 1 } } },
        });
      } catch (pushErr) {
        logger.warn(`Push notification failed for user ${userId}:`, pushErr.message);
      }
    }

    return true;
  } catch (err) {
    logger.error('Notification service error:', err);
  }
};

const sendBulkNotification = async (userIds, { type, title, body, data }) => {
  await Promise.allSettled(
    userIds.map((userId) => sendNotification({ userId, type, title, body, data }))
  );
};

const sendGroupNotification = async (groupId, { type, title, body, data }, excludeUserId) => {
  const members = await query(
    `SELECT user_id FROM research_group_members WHERE group_id = $1 AND is_active = TRUE`,
    [groupId]
  );

  const userIds = members.rows
    .map((m) => m.user_id)
    .filter((id) => id !== excludeUserId);

  await sendBulkNotification(userIds, { type, title, body, data });
};

module.exports = { sendNotification, sendBulkNotification, sendGroupNotification };
