const express = require('express');
const { setupSecurity } = require('./middleware/security');
const { globalErrorHandler, handleNotFound } = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const socialRoutes = require('./routes/social');
const analyticsRoutes = require('./routes/analytics');
const logger = require('./config/logger');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
const { authLimiter } = setupSecurity(app);

// Request logging
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', indexRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/analytics', analyticsRoutes);

// Future route placeholders (will be implemented in subsequent tasks)
// app.use('/api/schedule', scheduleRoutes);

// Handle unhandled routes
app.use('*', handleNotFound);

// Global error handling middleware
app.use(globalErrorHandler);

// Graceful shutdown handling
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

module.exports = app;