require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const logger = require('./config/logger');
const trendScheduler = require('./services/trendScheduler');
const analyticsScheduler = require('./services/analyticsScheduler');

// Connect to database
connectDB();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  
  // Start trend scheduler
  trendScheduler.start();
  logger.info('Trend scheduler initialized');
  
  // Start analytics scheduler
  analyticsScheduler.start();
  logger.info('Analytics scheduler initialized');
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  trendScheduler.stop();
  analyticsScheduler.stop();
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = server;