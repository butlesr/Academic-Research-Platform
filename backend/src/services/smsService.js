'use strict';

const logger = require('../utils/logger');

let twilioClient;

const getClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

const sendSMS = async ({ to, message }) => {
  try {
    const client = getClient();
    if (!client) {
      logger.warn('SMS service not configured');
      return;
    }

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to,
    });

    logger.info(`SMS sent to ${to}`);
  } catch (err) {
    logger.error('SMS send failed:', err.message);
  }
};

module.exports = { sendSMS };
