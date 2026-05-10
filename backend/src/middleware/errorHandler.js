'use strict';

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

const handlePgError = (err) => {
  if (err.code === '23505') {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'field';
    return new AppError(`Duplicate value for ${field}`, 409);
  }
  if (err.code === '23503') return new AppError('Referenced record not found', 400);
  if (err.code === '22P02') return new AppError('Invalid UUID format', 400);
  return null;
};

const handleMongooseValidation = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  return new AppError('Validation failed', 400, errors);
};

module.exports = (err, req, res, next) => {
  let error = err;

  // Transform known error types
  if (err.code && err.code.startsWith('2')) {
    const pgError = handlePgError(err);
    if (pgError) error = pgError;
  }

  if (err.name === 'ValidationError') error = handleMongooseValidation(err);
  if (err.name === 'CastError') error = new AppError('Invalid resource ID format', 400);
  if (err.name === 'MulterError') {
    error = new AppError(
      err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : 'File upload error',
      400
    );
  }

  // Log server errors
  if (!error.isOperational) {
    logger.error('Unexpected error:', err);
  }

  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    message: error.isOperational ? error.message : 'An unexpected error occurred',
    ...(error.errors && { errors: error.errors }),
  };

  if (process.env.NODE_ENV === 'development' && !error.isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
