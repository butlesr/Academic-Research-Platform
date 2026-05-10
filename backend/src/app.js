'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const { connectPostgres } = require('./config/database');
const { connectMongo } = require('./config/mongodb');
const { connectRedis } = require('./config/redis');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { initSocketHandlers } = require('./socket');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const researchRoutes = require('./routes/research');
const chatRoutes = require('./routes/chat');
const goalRoutes = require('./routes/goals');
const fileRoutes = require('./routes/files');
const attendanceRoutes = require('./routes/attendance');
const assignmentRoutes = require('./routes/assignments');
const examRoutes = require('./routes/exams');
const courseRoutes = require('./routes/courses');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');
const certificationRoutes = require('./routes/certifications');
const adminRoutes = require('./routes/admin');
const meetingRoutes = require('./routes/meetings');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Trust proxy (for production behind Nginx/load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const allowed = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Auth-specific stricter rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later.' },
});

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(compression());

// HTTP logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
  });
});

// API routes
const API = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(`${API}/auth`, authLimiter, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/research`, researchRoutes);
app.use(`${API}/chat`, chatRoutes);
app.use(`${API}/goals`, goalRoutes);
app.use(`${API}/files`, fileRoutes);
app.use(`${API}/attendance`, attendanceRoutes);
app.use(`${API}/assignments`, assignmentRoutes);
app.use(`${API}/exams`, examRoutes);
app.use(`${API}/courses`, courseRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/reports`, reportRoutes);
app.use(`${API}/ai`, aiRoutes);
app.use(`${API}/certifications`, certificationRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/meetings`, meetingRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use(errorHandler);

// Initialize Socket.IO handlers
initSocketHandlers(io);

// Attach io to app for use in routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectPostgres();
    await connectMongo();
    await connectRedis();

    server.listen(PORT, () => {
      logger.info(`🚀 Academic Research Platform API running on port ${PORT}`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🔗 API Base: /api/${process.env.API_VERSION || 'v1'}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
