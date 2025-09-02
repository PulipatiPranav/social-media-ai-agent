const socialMediaService = require('../services/socialMediaService');
const trendScheduler = require('../services/trendScheduler');
const connectedAccountService = require('../services/connectedAccountService');
const oauthService = require('../services/oauthService');
const Trend = require('../models/Trend');
const logger = require('../config/logger');

class SocialController {
  // Get Instagram trends
  async getInstagramTrends(req, res) {
    try {
      const { niche, limit = 20, page = 1 } = req.query;
      
      logger.info('Fetching Instagram trends', { niche, limit, page });

      // First try to get from database
      let trends = await Trend.findByNicheAndPlatform(
        niche ? [niche] : null, 
        'instagram', 
        parseInt(limit)
      );

      // If no trends in database or they're stale, fetch fresh ones
      if (trends.length === 0) {
        logger.info('No Instagram trends in database, fetching fresh data');
        const freshTrends = await socialMediaService.fetchInstagramTrends(niche);
        trends = await socialMediaService.storeTrends(freshTrends);
      }

      // Apply pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedTrends = trends.slice(skip, skip + parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          trends: paginatedTrends,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: trends.length,
            hasMore: skip + parseInt(limit) < trends.length
          }
        },
        message: `Retrieved ${paginatedTrends.length} Instagram trends`
      });
    } catch (error) {
      logger.error('Error fetching Instagram trends:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INSTAGRAM_TRENDS_ERROR',
          message: 'Failed to fetch Instagram trends',
          details: error.message
        }
      });
    }
  }

  // Get TikTok trends
  async getTikTokTrends(req, res) {
    try {
      const { niche, limit = 20, page = 1 } = req.query;
      
      logger.info('Fetching TikTok trends', { niche, limit, page });

      let trends = await Trend.findByNicheAndPlatform(
        niche ? [niche] : null, 
        'tiktok', 
        parseInt(limit)
      );

      if (trends.length === 0) {
        logger.info('No TikTok trends in database, fetching fresh data');
        const freshTrends = await socialMediaService.fetchTikTokTrends(niche);
        trends = await socialMediaService.storeTrends(freshTrends);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedTrends = trends.slice(skip, skip + parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          trends: paginatedTrends,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: trends.length,
            hasMore: skip + parseInt(limit) < trends.length
          }
        },
        message: `Retrieved ${paginatedTrends.length} TikTok trends`
      });
    } catch (error) {
      logger.error('Error fetching TikTok trends:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TIKTOK_TRENDS_ERROR',
          message: 'Failed to fetch TikTok trends',
          details: error.message
        }
      });
    }
  }

  // Get YouTube trends
  async getYouTubeTrends(req, res) {
    try {
      const { niche, limit = 20, page = 1 } = req.query;
      
      logger.info('Fetching YouTube trends', { niche, limit, page });

      let trends = await Trend.findByNicheAndPlatform(
        niche ? [niche] : null, 
        'youtube', 
        parseInt(limit)
      );

      if (trends.length === 0) {
        logger.info('No YouTube trends in database, fetching fresh data');
        const freshTrends = await socialMediaService.fetchYouTubeTrends(niche);
        trends = await socialMediaService.storeTrends(freshTrends);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const paginatedTrends = trends.slice(skip, skip + parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          trends: paginatedTrends,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: trends.length,
            hasMore: skip + parseInt(limit) < trends.length
          }
        },
        message: `Retrieved ${paginatedTrends.length} YouTube trends`
      });
    } catch (error) {
      logger.error('Error fetching YouTube trends:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'YOUTUBE_TRENDS_ERROR',
          message: 'Failed to fetch YouTube trends',
          details: error.message
        }
      });
    }
  }

  // Get trends from all platforms
  async getAllTrends(req, res) {
    try {
      const { niche, limit = 50, page = 1, sortBy = 'relevanceScore' } = req.query;
      
      logger.info('Fetching trends from all platforms', { niche, limit, page, sortBy });

      const platforms = ['instagram', 'tiktok', 'youtube'];
      let query = {
        platform: { $in: platforms },
        isActive: true,
        expiresAt: { $gt: new Date() }
      };

      // Add niche filter if provided
      if (niche) {
        query.niche = { $in: Array.isArray(niche) ? niche : [niche] };
      }

      // Build sort object
      const sortOptions = {};
      switch (sortBy) {
        case 'growth':
          sortOptions['metrics.growth'] = -1;
          break;
        case 'views':
          sortOptions['metrics.views'] = -1;
          break;
        case 'engagement':
          sortOptions['metrics.engagementRate'] = -1;
          break;
        case 'recent':
          sortOptions.createdAt = -1;
          break;
        default:
          sortOptions.relevanceScore = -1;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [trends, totalCount] = await Promise.all([
        Trend.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Trend.countDocuments(query)
      ]);

      res.status(200).json({
        success: true,
        data: {
          trends,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            hasMore: skip + parseInt(limit) < totalCount,
            totalPages: Math.ceil(totalCount / parseInt(limit))
          },
          filters: {
            niche,
            sortBy,
            platforms
          }
        },
        message: `Retrieved ${trends.length} trends from all platforms`
      });
    } catch (error) {
      logger.error('Error fetching all trends:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ALL_TRENDS_ERROR',
          message: 'Failed to fetch trends from all platforms',
          details: error.message
        }
      });
    }
  }

  // Get trending content (high growth/engagement)
  async getTrendingContent(req, res) {
    try {
      const { platforms, limit = 30 } = req.query;
      
      logger.info('Fetching trending content', { platforms, limit });

      const platformList = platforms ? 
        (Array.isArray(platforms) ? platforms : platforms.split(',')) : 
        ['instagram', 'tiktok', 'youtube'];

      const trends = await Trend.findTrending(platformList, parseInt(limit));

      res.status(200).json({
        success: true,
        data: {
          trends,
          count: trends.length,
          platforms: platformList
        },
        message: `Retrieved ${trends.length} trending content pieces`
      });
    } catch (error) {
      logger.error('Error fetching trending content:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TRENDING_CONTENT_ERROR',
          message: 'Failed to fetch trending content',
          details: error.message
        }
      });
    }
  }

  // Manually trigger trend refresh
  async refreshTrends(req, res) {
    try {
      const { platform, niche } = req.body;
      
      logger.info('Manual trend refresh triggered', { platform, niche });

      const trends = await trendScheduler.triggerTrendFetch(platform, niche);

      res.status(200).json({
        success: true,
        data: {
          trends,
          count: trends.length
        },
        message: `Successfully refreshed ${trends.length} trends`
      });
    } catch (error) {
      logger.error('Error refreshing trends:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TREND_REFRESH_ERROR',
          message: 'Failed to refresh trends',
          details: error.message
        }
      });
    }
  }

  // Get trend statistics
  async getTrendStatistics(req, res) {
    try {
      logger.info('Fetching trend statistics');

      const stats = await trendScheduler.getTrendStatistics();

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Retrieved trend statistics successfully'
      });
    } catch (error) {
      logger.error('Error fetching trend statistics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TREND_STATS_ERROR',
          message: 'Failed to fetch trend statistics',
          details: error.message
        }
      });
    }
  }

  // Get scheduler status
  async getSchedulerStatus(req, res) {
    try {
      const status = trendScheduler.getStatus();

      res.status(200).json({
        success: true,
        data: status,
        message: 'Retrieved scheduler status successfully'
      });
    } catch (error) {
      logger.error('Error fetching scheduler status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SCHEDULER_STATUS_ERROR',
          message: 'Failed to fetch scheduler status',
          details: error.message
        }
      });
    }
  }

  // Search trends by keyword
  async searchTrends(req, res) {
    try {
      const { query, platform, niche, limit = 20, page = 1 } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_QUERY',
            message: 'Search query is required'
          }
        });
      }

      logger.info('Searching trends', { query, platform, niche, limit, page });

      let searchFilter = {
        isActive: true,
        expiresAt: { $gt: new Date() },
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { hashtags: { $in: [new RegExp(query, 'i')] } }
        ]
      };

      if (platform) {
        searchFilter.platform = platform;
      }

      if (niche) {
        searchFilter.niche = { $in: Array.isArray(niche) ? niche : [niche] };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [trends, totalCount] = await Promise.all([
        Trend.find(searchFilter)
          .sort({ relevanceScore: -1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Trend.countDocuments(searchFilter)
      ]);

      res.status(200).json({
        success: true,
        data: {
          trends,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            hasMore: skip + parseInt(limit) < totalCount
          },
          searchQuery: query
        },
        message: `Found ${trends.length} trends matching "${query}"`
      });
    } catch (error) {
      logger.error('Error searching trends:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TREND_SEARCH_ERROR',
          message: 'Failed to search trends',
          details: error.message
        }
      });
    }
  }

  // OAuth and Account Connection Methods

  // Get OAuth authorization URL
  async getAuthUrl(req, res) {
    try {
      const { platform } = req.params;
      const userId = req.user.userId;

      if (!['instagram', 'tiktok', 'youtube'].includes(platform)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PLATFORM',
            message: 'Unsupported platform'
          }
        });
      }

      // Generate secure state parameter
      const state = oauthService.generateState(userId, platform);

      // Get platform-specific authorization URL
      let authUrl;
      switch (platform) {
        case 'instagram':
          authUrl = oauthService.getInstagramAuthUrl(state);
          break;
        case 'tiktok':
          authUrl = oauthService.getTikTokAuthUrl(state);
          break;
        case 'youtube':
          authUrl = oauthService.getYouTubeAuthUrl(state);
          break;
      }

      logger.info(`Generated ${platform} auth URL for user ${userId}`);

      res.status(200).json({
        success: true,
        data: {
          authUrl: authUrl,
          platform: platform,
          state: state
        },
        message: `${platform} authorization URL generated successfully`
      });
    } catch (error) {
      logger.error('Error generating auth URL:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_URL_ERROR',
          message: 'Failed to generate authorization URL',
          details: error.message
        }
      });
    }
  }

  // Connect social media account
  async connectAccount(req, res) {
    try {
      const { platform, code, state } = req.body;
      const userId = req.user.userId;

      logger.info(`Connecting ${platform} account for user ${userId}`);

      // Verify state parameter
      const stateVerification = oauthService.verifyState(state, userId, platform);
      if (!stateVerification.isValid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATE',
            message: stateVerification.error
          }
        });
      }

      // Exchange authorization code for access token
      let tokenData;
      switch (platform) {
        case 'instagram':
          tokenData = await oauthService.exchangeInstagramCode(code);
          break;
        case 'tiktok':
          tokenData = await oauthService.exchangeTikTokCode(code);
          break;
        case 'youtube':
          tokenData = await oauthService.exchangeYouTubeCode(code);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PLATFORM',
              message: 'Unsupported platform'
            }
          });
      }

      // Add connected account to user
      const result = await connectedAccountService.addConnectedAccount(userId, platform, tokenData);

      logger.info(`Successfully connected ${platform} account for user ${userId}`);

      res.status(200).json({
        success: true,
        data: result.data,
        message: `${platform} account connected successfully`
      });
    } catch (error) {
      logger.error('Error connecting account:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ACCOUNT_CONNECTION_ERROR',
          message: 'Failed to connect account',
          details: error.message
        }
      });
    }
  }

  // Get connected accounts
  async getConnectedAccounts(req, res) {
    try {
      const { platform } = req.query;
      const userId = req.user.userId;

      logger.info(`Getting connected accounts for user ${userId}`, { platform });

      const result = await connectedAccountService.getConnectedAccounts(userId, platform);

      res.status(200).json({
        success: true,
        data: {
          accounts: result.data,
          count: result.data.length
        },
        message: 'Connected accounts retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting connected accounts:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ACCOUNTS_ERROR',
          message: 'Failed to get connected accounts',
          details: error.message
        }
      });
    }
  }

  // Disconnect account
  async disconnectAccount(req, res) {
    try {
      const { platform, accountId } = req.body;
      const userId = req.user.userId;

      logger.info(`Disconnecting ${platform} account ${accountId} for user ${userId}`);

      const result = await connectedAccountService.removeConnectedAccount(userId, platform, accountId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Error disconnecting account:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DISCONNECT_ACCOUNT_ERROR',
          message: 'Failed to disconnect account',
          details: error.message
        }
      });
    }
  }

  // Verify account permissions
  async verifyAccount(req, res) {
    try {
      const { platform, accountId } = req.body;
      const userId = req.user.userId;

      logger.info(`Verifying ${platform} account for user ${userId}`, { accountId });

      const result = await connectedAccountService.verifyAccountPermissions(userId, platform, accountId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'ACCOUNT_VERIFICATION_FAILED',
            message: result.error
          }
        });
      }
    } catch (error) {
      logger.error('Error verifying account:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ACCOUNT_VERIFICATION_ERROR',
          message: 'Failed to verify account',
          details: error.message
        }
      });
    }
  }

  // Get user analytics
  async getUserAnalytics(req, res) {
    try {
      const { platform, accountId, startDate, endDate, groupBy, limit, contentId } = req.query;
      const userId = req.user.userId;

      logger.info(`Getting analytics for user ${userId}`, { platform, accountId, startDate, endDate });

      const analyticsService = require('../services/analyticsService');

      let result;

      if (contentId) {
        // Get analytics for specific content
        result = await analyticsService.getContentAnalytics(userId, contentId);
      } else {
        // Get user analytics summary
        result = await analyticsService.getUserAnalyticsSummary(userId, {
          platform,
          startDate,
          endDate,
          groupBy,
          limit: limit ? parseInt(limit) : undefined
        });
      }

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Analytics data retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'ANALYTICS_ERROR',
            message: result.error
          }
        });
      }
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'USER_ANALYTICS_ERROR',
          message: 'Failed to get user analytics',
          details: error.message
        }
      });
    }
  }

  // Sync account data
  async syncAccount(req, res) {
    try {
      const { platform, accountId } = req.body;
      const userId = req.user.userId;

      logger.info(`Syncing ${platform} account data for user ${userId}`, { accountId });

      const result = await connectedAccountService.syncAccountData(userId, platform, accountId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'ACCOUNT_SYNC_ERROR',
            message: result.error
          }
        });
      }
    } catch (error) {
      logger.error('Error syncing account:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ACCOUNT_SYNC_ERROR',
          message: 'Failed to sync account data',
          details: error.message
        }
      });
    }
  }

  // Sync analytics data
  async syncAnalytics(req, res) {
    try {
      const { platform, accountId } = req.body;
      const userId = req.user.userId;

      logger.info(`Syncing ${platform} analytics for user ${userId}`, { accountId });

      const analyticsService = require('../services/analyticsService');
      const result = await analyticsService.syncAnalyticsData(userId, platform, accountId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Analytics data synchronized successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'ANALYTICS_SYNC_ERROR',
            message: result.error
          }
        });
      }
    } catch (error) {
      logger.error('Error syncing analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ANALYTICS_SYNC_ERROR',
          message: 'Failed to sync analytics data',
          details: error.message
        }
      });
    }
  }

  // Get content analytics
  async getContentAnalytics(req, res) {
    try {
      const { contentId } = req.params;
      const userId = req.user.userId;

      logger.info(`Getting content analytics for user ${userId}`, { contentId });

      const analyticsService = require('../services/analyticsService');
      const result = await analyticsService.getContentAnalytics(userId, contentId);

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Content analytics retrieved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: {
            code: 'CONTENT_ANALYTICS_NOT_FOUND',
            message: result.error
          }
        });
      }
    } catch (error) {
      logger.error('Error getting content analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CONTENT_ANALYTICS_ERROR',
          message: 'Failed to get content analytics',
          details: error.message
        }
      });
    }
  }

  // Get performance analytics
  async getPerformanceAnalytics(req, res) {
    try {
      const { platform, startDate, endDate, groupBy = 'day' } = req.query;
      const userId = req.user.userId;

      logger.info(`Getting performance analytics for user ${userId}`, { platform, startDate, endDate, groupBy });

      const analyticsService = require('../services/analyticsService');
      const result = await analyticsService.getUserAnalyticsSummary(userId, {
        platform,
        startDate,
        endDate,
        groupBy
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          message: 'Performance analytics retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'PERFORMANCE_ANALYTICS_ERROR',
            message: result.error
          }
        });
      }
    } catch (error) {
      logger.error('Error getting performance analytics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'PERFORMANCE_ANALYTICS_ERROR',
          message: 'Failed to get performance analytics',
          details: error.message
        }
      });
    }
  }

  // Manage automatic analytics sync
  async manageAutoSync(req, res) {
    try {
      const { action, intervalMinutes = 60 } = req.body;
      const userId = req.user.userId;

      if (!['start', 'stop'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be either "start" or "stop"'
          }
        });
      }

      logger.info(`${action} auto-sync for user ${userId}`, { intervalMinutes });

      const analyticsService = require('../services/analyticsService');

      if (action === 'start') {
        analyticsService.startAutoSync(userId, intervalMinutes);
      } else {
        analyticsService.stopAutoSync(userId);
      }

      const status = analyticsService.getSyncStatus(userId);

      res.status(200).json({
        success: true,
        data: {
          action,
          status,
          intervalMinutes: action === 'start' ? intervalMinutes : null
        },
        message: `Auto-sync ${action === 'start' ? 'started' : 'stopped'} successfully`
      });
    } catch (error) {
      logger.error('Error managing auto-sync:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTO_SYNC_ERROR',
          message: 'Failed to manage auto-sync',
          details: error.message
        }
      });
    }
  }
}

module.exports = new SocialController();