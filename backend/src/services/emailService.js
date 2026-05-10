'use strict';

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,
      maxConnections: 5,
    });
  }
  return transporter;
};

const emailTemplates = {
  'email-verification': ({ name, verifyUrl }) => ({
    subject: 'Verify Your Academic Platform Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2196F3 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎓 Academic Research Platform</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h2 style="color: #1e3a5f;">Hello, ${name}! 👋</h2>
          <p style="color: #555; line-height: 1.6;">Welcome to the Academic Research & Learning Management Platform. Please verify your email address to activate your account.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #1e3a5f, #2196F3); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              ✅ Verify Email Address
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
        </div>
      </div>`,
  }),

  'password-reset': ({ name, resetUrl }) => ({
    subject: 'Password Reset - Academic Research Platform',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2196F3 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h2 style="color: #1e3a5f;">Hello, ${name}</h2>
          <p style="color: #555;">You requested a password reset. Click the button below to create a new password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #e53e3e; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      </div>`,
  }),

  'deadline-reminder': ({ name, goalTitle, dueDate, daysLeft }) => ({
    subject: `⏰ Deadline Reminder: ${goalTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${daysLeft <= 1 ? '#e53e3e' : '#f6ad55'}; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">⏰ ${daysLeft <= 1 ? 'URGENT: ' : ''}Deadline Reminder</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h2 style="color: #1e3a5f;">Hello, ${name}</h2>
          <p style="color: #555;">This is a reminder that the following goal is due <strong>${daysLeft <= 0 ? 'TODAY' : `in ${daysLeft} day(s)`}</strong>:</p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <strong style="color: #1e3a5f; font-size: 18px;">${goalTitle}</strong>
            <p style="color: #666; margin: 5px 0 0;">Due: ${new Date(dueDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <p style="color: #555;">Please log in to the platform to update your progress or submit your work.</p>
        </div>
      </div>`,
  }),
};

const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    const transport = getTransporter();
    let emailContent = { subject, html, text };

    if (template && emailTemplates[template]) {
      const rendered = emailTemplates[template](data);
      emailContent = { ...rendered };
    }

    await transport.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Academic Platform'}" <${process.env.EMAIL_FROM}>`,
      to,
      ...emailContent,
    });

    logger.info(`Email sent to ${to}: ${emailContent.subject}`);
  } catch (err) {
    logger.error('Email send failed:', err.message);
    // Don't throw — email failures shouldn't break the main flow
  }
};

module.exports = { sendEmail };
