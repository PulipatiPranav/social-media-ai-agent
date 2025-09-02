const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

// Validation schemas
const trendQuerySchema = Joi.object({
  niche: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1)
});

const allTrendsQuerySchema = Joi.object({
  niche: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  page: Joi.number().integer().min(1).default(1),
  sortBy: Joi.string().valid('relevanceScore', 'growth', 'views', 'engagement', 'recent').default('relevanceScore')
});

const trendingContentQuerySchema = Joi.object({
  platforms: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string().valid('instagram', 'tiktok', 'youtube'))
  ).optional(),
  limit: Joi.number().integer().min(1).max(50).default(30)
});

const refreshTrendsSchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').optional(),
  niche: Joi.string().optional()
});

const searchTrendsSchema = Joi.object({
  query: Joi.string().required().min(2).max(100),
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').optional(),
  niche: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  ).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
  page: Joi.number().integer().min(1).default(1)
});

const connectAccountSchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').required(),
  code: Joi.string().required(),
  state: Joi.string().required()
});

const disconnectAccountSchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').required(),
  accountId: Joi.string().required()
});

const verifyAccountSchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').required(),
  accountId: Joi.string().optional()
});

const analyticsSchema = Joi.object({
  platform: Joi.string().valid('instagram', 'tiktok', 'youtube').optional(),
  accountId: Joi.string().optional(),
  mediaId: Joi.string().optional(),
  videoId: Joi.string().optional(),
  period: Joi.string().valid('day', 'week', 'days_28').optional(),
  since: Joi.string().optional(),
  until: Joi.string().optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
  limit: Joi.number().integer().min(1).max(1000).optional(),
  contentId: Joi.string().optional()
});

const autoSyncSchema = Joi.object({
  action: Joi.string().valid('start', 'stop').required(),
  intervalMinutes: Joi.number().integer().min(5).max(1440).optional() // 5 minutes to 24 hours
});

/**
 * @route   GET /api/social/trends/instagram
 * @desc    Get Instagram trends
 * @access  Private
 * @query   niche (optional), limit (default: 20), page (default: 1)
 */
router.get('/trends/instagram', 
  authenticateToken, 
  validate(trendQuerySchema, 'query'), 
  socialController.getInstagramTrends
);

/**
 * @route   GET /api/social/trends/tiktok
 * @desc    Get TikTok trends
 * @access  Private
 * @query   niche (optional), limit (default: 20), page (default: 1)
 */
router.get('/trends/tiktok', 
  authenticateToken, 
  validate(trendQuerySchema, 'query'), 
  socialController.getTikTokTrends
);

/**
 * @route   GET /api/social/trends/youtube
 * @desc    Get YouTube trends
 * @access  Private
 * @query   niche (optional), limit (default: 20), page (default: 1)
 */
router.get('/trends/youtube', 
  authenticateToken, 
  validate(trendQuerySchema, 'query'), 
  socialController.getYouTubeTrends
);

/**
 * @route   GET /api/social/trends
 * @desc    Get trends from all platforms
 * @access  Private
 * @query   niche (optional), limit (default: 50), page (default: 1), sortBy (default: relevanceScore)
 */
router.get('/trends', 
  authenticateToken, 
  validate(allTrendsQuerySchema, 'query'), 
  socialController.getAllTrends
);

/**
 * @route   GET /api/social/trending
 * @desc    Get currently trending content (high growth/engagement)
 * @access  Private
 * @query   platforms (optional), limit (default: 30)
 */
router.get('/trending', 
  authenticateToken, 
  validate(trendingContentQuerySchema, 'query'), 
  socialController.getTrendingContent
);

/**
 * @route   GET /api/social/search
 * @desc    Search trends by keyword
 * @access  Private
 * @query   query (required), platform (optional), niche (optional), limit (default: 20), page (default: 1)
 */
router.get('/search', 
  authenticateToken, 
  validate(searchTrendsSchema, 'query'), 
  socialController.searchTrends
);

/**
 * @route   POST /api/social/trends/refresh
 * @desc    Manually trigger trend refresh
 * @access  Private
 * @body    platform (optional), niche (optional)
 */
router.post('/trends/refresh', 
  authenticateToken, 
  validate(refreshTrendsSchema, 'body'), 
  socialController.refreshTrends
);

/**
 * @route   GET /api/social/statistics
 * @desc    Get trend statistics
 * @access  Private
 */
router.get('/statistics', 
  authenticateToken, 
  socialController.getTrendStatistics
);

/**
 * @route   GET /api/social/scheduler/status
 * @desc    Get trend scheduler status
 * @access  Private
 */
router.get('/scheduler/status', 
  authenticateToken, 
  socialController.getSchedulerStatus
);

// OAuth and Account Connection Routes

/**
 * @route   GET /api/social/auth/:platform
 * @desc    Get OAuth authorization URL for platform
 * @access  Private
 */
router.get('/auth/:platform', 
  authenticateToken, 
  socialController.getAuthUrl
);

/**
 * @route   POST /api/social/connect-account
 * @desc    Connect social media account using OAuth code
 * @access  Private
 * @body    platform, code, state
 */
router.post('/connect-account', 
  authenticateToken, 
  validate(connectAccountSchema, 'body'), 
  socialController.connectAccount
);

/**
 * @route   GET /api/social/connected-accounts
 * @desc    Get user's connected accounts
 * @access  Private
 * @query   platform (optional)
 */
router.get('/connected-accounts', 
  authenticateToken, 
  socialController.getConnectedAccounts
);

/**
 * @route   DELETE /api/social/disconnect-account
 * @desc    Disconnect social media account
 * @access  Private
 * @body    platform, accountId
 */
router.delete('/disconnect-account', 
  authenticateToken, 
  validate(disconnectAccountSchema, 'body'), 
  socialController.disconnectAccount
);

/**
 * @route   POST /api/social/verify-account
 * @desc    Verify account permissions and token validity
 * @access  Private
 * @body    platform, accountId (optional)
 */
router.post('/verify-account', 
  authenticateToken, 
  validate(verifyAccountSchema, 'body'), 
  socialController.verifyAccount
);

/**
 * @route   GET /api/social/user-analytics
 * @desc    Get analytics data for connected account
 * @access  Private
 * @query   platform, accountId (optional), other analytics parameters
 */
router.get('/user-analytics', 
  authenticateToken, 
  validate(analyticsSchema, 'query'), 
  socialController.getUserAnalytics
);

/**
 * @route   POST /api/social/sync-analytics
 * @desc    Sync analytics data from social media platforms
 * @access  Private
 * @body    platform, accountId (optional)
 */
router.post('/sync-analytics', 
  authenticateToken, 
  validate(verifyAccountSchema, 'body'), 
  socialController.syncAnalytics
);

/**
 * @route   GET /api/social/analytics/content/:contentId
 * @desc    Get analytics for specific content
 * @access  Private
 */
router.get('/analytics/content/:contentId', 
  authenticateToken, 
  socialController.getContentAnalytics
);

/**
 * @route   GET /api/social/analytics/performance
 * @desc    Get performance analytics and insights
 * @access  Private
 * @query   platform (optional), startDate, endDate, groupBy
 */
router.get('/analytics/performance', 
  authenticateToken, 
  socialController.getPerformanceAnalytics
);

/**
 * @route   POST /api/social/analytics/auto-sync
 * @desc    Start/stop automatic analytics synchronization
 * @access  Private
 * @body    action (start/stop), intervalMinutes (optional)
 */
router.post('/analytics/auto-sync', 
  authenticateToken, 
  validate(autoSyncSchema, 'body'),
  socialController.manageAutoSync
);

/**
 * @route   POST /api/social/sync-account
 * @desc    Sync account data and update profile information
 * @access  Private
 * @body    platform, accountId (optional)
 */
router.post('/sync-account', 
  authenticateToken, 
  validate(verifyAccountSchema, 'body'), 
  socialController.syncAccount
);

module.exports = router;