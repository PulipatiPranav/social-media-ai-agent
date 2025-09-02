const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

// Validation schemas
const performanceQuerySchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day'),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  includeGrowth: Joi.string().valid('true', 'false').default('true')
});

const engagementQuerySchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day'),
  includeComparison: Joi.string().valid('true', 'false').default('true')
});

const syncAnalyticsSchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').optional(),
  accountId: Joi.string().optional(),
  force: Joi.boolean().default(false)
});

const dashboardQuerySchema = Joi.object({
  timeframe: Joi.string().valid('7d', '30d', '90d').default('30d')
});

const aiInsightsQuerySchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').optional(),
  timeframe: Joi.string().valid('7d', '30d', '90d').default('30d')
});

const autoSyncSchema = Joi.object({
  action: Joi.string().valid('start', 'stop').required(),
  intervalMinutes: Joi.number().integer().min(5).max(1440).optional() // 5 minutes to 24 hours
});

const contentIdSchema = Joi.object({
  contentId: Joi.string().required()
});

/**
 * @route   GET /api/analytics/performance
 * @desc    Get comprehensive performance analytics
 * @access  Private
 * @query   platform, startDate, endDate, groupBy, limit, includeGrowth
 */
router.get('/performance', 
  authenticateToken, 
  validate(performanceQuerySchema, 'query'), 
  analyticsController.getPerformanceAnalytics
);

/**
 * @route   GET /api/analytics/engagement
 * @desc    Get engagement metrics and insights
 * @access  Private
 * @query   platform, startDate, endDate, groupBy, includeComparison
 */
router.get('/engagement', 
  authenticateToken, 
  validate(engagementQuerySchema, 'query'), 
  analyticsController.getEngagementMetrics
);

/**
 * @route   GET /api/analytics/content/:contentId
 * @desc    Get analytics for specific content piece
 * @access  Private
 * @param   contentId - Content ID
 */
router.get('/content/:contentId', 
  authenticateToken, 
  validate(contentIdSchema, 'params'), 
  analyticsController.getContentAnalytics
);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get analytics dashboard data
 * @access  Private
 * @query   timeframe (7d, 30d, 90d)
 */
router.get('/dashboard', 
  authenticateToken, 
  validate(dashboardQuerySchema, 'query'), 
  analyticsController.getDashboardData
);

/**
 * @route   GET /api/analytics/ai-insights
 * @desc    Get AI-powered insights and recommendations
 * @access  Private
 * @query   platform, timeframe
 */
router.get('/ai-insights', 
  authenticateToken, 
  validate(aiInsightsQuerySchema, 'query'), 
  analyticsController.getAIInsights
);

/**
 * @route   POST /api/analytics/sync
 * @desc    Sync analytics data from social platforms
 * @access  Private
 * @body    platform, accountId, force
 */
router.post('/sync', 
  authenticateToken, 
  validate(syncAnalyticsSchema, 'body'), 
  analyticsController.syncAnalytics
);

/**
 * @route   POST /api/analytics/auto-sync
 * @desc    Manage automatic analytics synchronization
 * @access  Private
 * @body    action (start/stop), intervalMinutes
 */
router.post('/auto-sync', 
  authenticateToken, 
  validate(autoSyncSchema, 'body'), 
  analyticsController.manageAutoSync
);

/**
 * @route   GET /api/analytics/sync-status
 * @desc    Get analytics sync status and statistics
 * @access  Private
 */
router.get('/sync-status', 
  authenticateToken, 
  analyticsController.getSyncStatus
);

module.exports = router;