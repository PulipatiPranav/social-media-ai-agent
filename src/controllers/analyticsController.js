const analyticsService = require('../services/analyticsService');
const analyticsScheduler = require('../services/analyticsScheduler');
const logger = require('../config/logger');

class AnalyticsController {
  /**
   * Get comprehensive performance analytics for user
   * @route GET /api/analytics/performance
   */
  async getPerformanceAnalytics(req, res) {
    try {
      const { 
        platform, 
        startDate, 
        endDate, 
        groupBy = 'day', 
        limit = 100,
        includeGrowth = 'true'
      } = req.query;
      const userId = req.user.userId;

      logger.info(`Getting performance analytics for user ${userId}`, { 
        platform, 
        startDate, 
        endDate, 
        groupBy 
      });

      const result = await analyticsService.getUserAnalyticsSummary(userId, {
        platform,
        startDate,
        endDate,
        groupBy,
        limit: parseInt(limit)
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PERFORMANCE_ANALYTICS_ERROR',
            message: result.error
          }
        });
      }

      // Add growth metrics if requested
      if (includeGrowth === 'true') {
        const growthMetrics = await analyticsService.calculateGrowthMetrics(userId, {
          platform,
          startDate,
          endDate
        });
        result.data.growthMetrics = growthMetrics;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Performance analytics retrieved successfully'
      });
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

  /**
   * Get analytics for specific content piece
   * @route GET /api/analytics/content/:contentId
   */
  async getContentAnalytics(req, res) {
    try {
      const { contentId } = req.params;
      const userId = req.user.userId;

      logger.info(`Getting content analytics for user ${userId}`, { contentId });

      const result = await analyticsService.getContentAnalytics(userId, contentId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONTENT_ANALYTICS_NOT_FOUND',
            message: result.error
          }
        });
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Content analytics retrieved successfully'
      });
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

  /**
   * Get engagement metrics and insights
   * @route GET /api/analytics/engagement
   */
  async getEngagementMetrics(req, res) {
    try {
      const { 
        platform, 
        startDate, 
        endDate, 
        groupBy = 'day',
        includeComparison = 'true'
      } = req.query;
      const userId = req.user.userId;

      logger.info(`Getting engagement metrics for user ${userId}`, { 
        platform, 
        startDate, 
        endDate 
      });

      // Get main engagement data
      const result = await analyticsService.getUserAnalyticsSummary(userId, {
        platform,
        startDate,
        endDate,
        groupBy
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ENGAGEMENT_METRICS_ERROR',
            message: result.error
          }
        });
      }

      // Add engagement-specific insights
      const engagementData = {
        ...result.data,
        insights: {
          topEngagementHours: await this.getTopEngagementHours(userId, platform, startDate, endDate),
          engagementTrends: await this.getEngagementTrends(userId, platform, startDate, endDate),
          contentTypePerformance: await this.getContentTypePerformance(userId, platform, startDate, endDate)
        }
      };

      // Add comparison with previous period if requested
      if (includeComparison === 'true') {
        const comparisonMetrics = await analyticsService.calculateGrowthMetrics(userId, {
          platform,
          startDate,
          endDate
        });
        engagementData.comparison = comparisonMetrics;
      }

      res.status(200).json({
        success: true,
        data: engagementData,
        message: 'Engagement metrics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'ENGAGEMENT_METRICS_ERROR',
          message: 'Failed to get engagement metrics',
          details: error.message
        }
      });
    }
  }

  /**
   * Sync analytics data from social platforms
   * @route POST /api/analytics/sync
   */
  async syncAnalytics(req, res) {
    try {
      const { platform, accountId, force = false } = req.body;
      const userId = req.user.userId;

      logger.info(`Syncing analytics for user ${userId}`, { platform, accountId, force });

      const result = await analyticsService.syncAnalyticsData(userId, platform, accountId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ANALYTICS_SYNC_ERROR',
            message: result.error
          }
        });
      }

      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Analytics data synchronized successfully'
      });
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

  /**
   * Get analytics dashboard data
   * @route GET /api/analytics/dashboard
   */
  async getDashboardData(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      const userId = req.user.userId;

      logger.info(`Getting dashboard data for user ${userId}`, { timeframe });

      // Calculate date range based on timeframe
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Get comprehensive analytics data
      const [
        overallMetrics,
        topContent,
        platformBreakdown,
        recentActivity
      ] = await Promise.all([
        analyticsService.getUserAnalyticsSummary(userId, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }),
        analyticsService.getTopPerformingContent(userId, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit: 5
        }),
        this.getPlatformBreakdown(userId, startDate.toISOString(), endDate.toISOString()),
        this.getRecentActivity(userId, 10)
      ]);

      const dashboardData = {
        timeframe,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        overview: overallMetrics.success ? overallMetrics.data.summary : null,
        topContent: topContent || [],
        platformBreakdown: platformBreakdown || [],
        recentActivity: recentActivity || [],
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: dashboardData,
        message: 'Dashboard data retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DASHBOARD_DATA_ERROR',
          message: 'Failed to get dashboard data',
          details: error.message
        }
      });
    }
  }

  /**
   * Get AI-powered insights and recommendations
   * @route GET /api/analytics/ai-insights
   */
  async getAIInsights(req, res) {
    try {
      const { platform, timeframe = '30d' } = req.query;
      const userId = req.user.userId;

      logger.info(`Getting AI insights for user ${userId}`, { platform, timeframe });

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeframe.replace('d', '')));

      // Get analytics data for insights
      const analyticsData = await analyticsService.getUserAnalyticsSummary(userId, {
        platform,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (!analyticsData.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AI_INSIGHTS_ERROR',
            message: 'Failed to get analytics data for insights'
          }
        });
      }

      // Generate AI insights
      const insights = await this.generateAIInsights(userId, analyticsData.data, platform);

      res.status(200).json({
        success: true,
        data: {
          insights,
          basedOnData: {
            timeframe,
            platform: platform || 'all',
            dateRange: {
              start: startDate.toISOString(),
              end: endDate.toISOString()
            }
          },
          generatedAt: new Date().toISOString()
        },
        message: 'AI insights generated successfully'
      });
    } catch (error) {
      logger.error('Error getting AI insights:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AI_INSIGHTS_ERROR',
          message: 'Failed to generate AI insights',
          details: error.message
        }
      });
    }
  }

  /**
   * Manage automatic analytics synchronization
   * @route POST /api/analytics/auto-sync
   */
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

  /**
   * Get analytics sync status and statistics
   * @route GET /api/analytics/sync-status
   */
  async getSyncStatus(req, res) {
    try {
      const userId = req.user.userId;

      logger.info(`Getting sync status for user ${userId}`);

      const [userSyncStatus, globalStats] = await Promise.all([
        analyticsService.getSyncStatus(userId),
        analyticsScheduler.getSyncStatistics()
      ]);

      res.status(200).json({
        success: true,
        data: {
          userSync: userSyncStatus,
          globalStats: globalStats.success ? globalStats.data : null,
          schedulerStatus: analyticsScheduler.getStatus()
        },
        message: 'Sync status retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting sync status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYNC_STATUS_ERROR',
          message: 'Failed to get sync status',
          details: error.message
        }
      });
    }
  }

  // Helper methods

  /**
   * Get top engagement hours for user
   */
  async getTopEngagementHours(userId, platform, startDate, endDate) {
    try {
      const Analytics = require('../models/Analytics');
      const mongoose = require('mongoose');

      let matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true
      };

      if (platform) matchStage.platform = platform;
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: { $hour: '$timestamp' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            totalEngagement: {
              $sum: {
                $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares', '$metrics.saves']
              }
            },
            contentCount: { $sum: 1 }
          }
        },
        { $sort: { avgEngagementRate: -1 } },
        { $limit: 5 }
      ];

      return await Analytics.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting top engagement hours:', error);
      return [];
    }
  }

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(userId, platform, startDate, endDate) {
    try {
      const Analytics = require('../models/Analytics');
      const mongoose = require('mongoose');

      let matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true
      };

      if (platform) matchStage.platform = platform;
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            totalEngagement: {
              $sum: {
                $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares', '$metrics.saves']
              }
            },
            date: { $first: '$timestamp' }
          }
        },
        { $sort: { date: 1 } },
        { $limit: 30 }
      ];

      return await Analytics.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting engagement trends:', error);
      return [];
    }
  }

  /**
   * Get content type performance breakdown
   */
  async getContentTypePerformance(userId, platform, startDate, endDate) {
    try {
      const Analytics = require('../models/Analytics');
      const mongoose = require('mongoose');

      let matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true
      };

      if (platform) matchStage.platform = platform;
      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: '$mediaType',
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            totalViews: { $sum: '$metrics.views' },
            totalEngagement: {
              $sum: {
                $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares', '$metrics.saves']
              }
            },
            contentCount: { $sum: 1 }
          }
        },
        { $sort: { avgEngagementRate: -1 } }
      ];

      return await Analytics.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting content type performance:', error);
      return [];
    }
  }

  /**
   * Get platform breakdown for dashboard
   */
  async getPlatformBreakdown(userId, startDate, endDate) {
    try {
      const platforms = ['instagram', 'tiktok', 'youtube'];
      const breakdown = [];

      for (const platform of platforms) {
        const result = await analyticsService.getUserAnalyticsSummary(userId, {
          platform,
          startDate,
          endDate
        });

        if (result.success) {
          breakdown.push({
            platform,
            ...result.data.summary
          });
        }
      }

      return breakdown;
    } catch (error) {
      logger.error('Error getting platform breakdown:', error);
      return [];
    }
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(userId, limit = 10) {
    try {
      const Analytics = require('../models/Analytics');
      const mongoose = require('mongoose');

      const pipeline = [
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            isActive: true
          }
        },
        { $sort: { syncedAt: -1 } },
        { $limit: limit },
        {
          $project: {
            platform: 1,
            mediaType: 1,
            metrics: 1,
            syncedAt: 1,
            timestamp: 1
          }
        }
      ];

      return await Analytics.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Generate AI-powered insights
   */
  async generateAIInsights(userId, analyticsData, platform) {
    try {
      const insights = {
        performance: [],
        recommendations: [],
        trends: [],
        opportunities: []
      };

      // Analyze performance
      if (analyticsData.summary) {
        const { avgEngagementRate, totalViews, contentCount } = analyticsData.summary;
        
        if (avgEngagementRate > 5) {
          insights.performance.push({
            type: 'positive',
            title: 'Strong Engagement Rate',
            description: `Your average engagement rate of ${avgEngagementRate.toFixed(2)}% is above industry average.`,
            impact: 'high'
          });
        } else if (avgEngagementRate < 2) {
          insights.performance.push({
            type: 'warning',
            title: 'Low Engagement Rate',
            description: `Your engagement rate of ${avgEngagementRate.toFixed(2)}% could be improved.`,
            impact: 'medium'
          });
        }

        // Content volume insights
        if (contentCount < 5) {
          insights.recommendations.push({
            type: 'suggestion',
            title: 'Increase Content Frequency',
            description: 'Consider posting more regularly to improve visibility and engagement.',
            priority: 'medium'
          });
        }
      }

      // Growth trends
      if (analyticsData.growthMetrics) {
        const { viewsGrowth, engagementGrowth } = analyticsData.growthMetrics;
        
        if (viewsGrowth > 20) {
          insights.trends.push({
            type: 'positive',
            title: 'Growing Viewership',
            description: `Your views have grown by ${viewsGrowth.toFixed(1)}% compared to the previous period.`,
            metric: 'views'
          });
        }

        if (engagementGrowth > 15) {
          insights.trends.push({
            type: 'positive',
            title: 'Improving Engagement',
            description: `Your engagement has increased by ${engagementGrowth.toFixed(1)}%.`,
            metric: 'engagement'
          });
        }
      }

      // Platform-specific opportunities
      if (platform) {
        insights.opportunities.push({
          type: 'platform',
          title: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Optimization`,
          description: `Focus on ${platform}-specific content strategies to maximize reach.`,
          platform
        });
      } else {
        insights.opportunities.push({
          type: 'cross-platform',
          title: 'Cross-Platform Strategy',
          description: 'Consider adapting your best-performing content across all platforms.',
          platform: 'all'
        });
      }

      return insights;
    } catch (error) {
      logger.error('Error generating AI insights:', error);
      return {
        performance: [],
        recommendations: [],
        trends: [],
        opportunities: []
      };
    }
  }
}

module.exports = new AnalyticsController();