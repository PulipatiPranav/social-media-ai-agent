const cron = require('node-cron');
const logger = require('../config/logger');
const analyticsService = require('./analyticsService');
const User = require('../models/User');

class AnalyticsScheduler {
  constructor() {
    this.scheduledTasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start the analytics scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Analytics scheduler is already running');
      return;
    }

    try {
      // Schedule analytics sync every 2 hours
      const syncTask = cron.schedule('0 */2 * * *', async () => {
        await this.syncAllUserAnalytics();
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      // Schedule daily analytics aggregation at 1 AM UTC
      const aggregationTask = cron.schedule('0 1 * * *', async () => {
        await this.performDailyAggregation();
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      // Schedule weekly analytics cleanup at 2 AM UTC on Sundays
      const cleanupTask = cron.schedule('0 2 * * 0', async () => {
        await this.performWeeklyCleanup();
      }, {
        scheduled: false,
        timezone: 'UTC'
      });

      // Start all scheduled tasks
      syncTask.start();
      aggregationTask.start();
      cleanupTask.start();

      this.scheduledTasks.set('sync', syncTask);
      this.scheduledTasks.set('aggregation', aggregationTask);
      this.scheduledTasks.set('cleanup', cleanupTask);

      this.isRunning = true;
      logger.info('Analytics scheduler started successfully');
    } catch (error) {
      logger.error('Error starting analytics scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop the analytics scheduler
   */
  stop() {
    try {
      this.scheduledTasks.forEach((task, name) => {
        task.stop();
        task.destroy();
        logger.info(`Stopped analytics scheduler task: ${name}`);
      });

      this.scheduledTasks.clear();
      this.isRunning = false;
      logger.info('Analytics scheduler stopped successfully');
    } catch (error) {
      logger.error('Error stopping analytics scheduler:', error);
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.scheduledTasks.keys()),
      taskCount: this.scheduledTasks.size,
      lastStarted: this.lastStarted || null,
      uptime: this.isRunning ? Date.now() - (this.lastStarted || Date.now()) : 0
    };
  }

  /**
   * Sync analytics for all users with connected accounts
   */
  async syncAllUserAnalytics() {
    try {
      logger.info('Starting scheduled analytics sync for all users');

      // Get all users with connected accounts
      const users = await User.find({
        'connectedAccounts.0': { $exists: true },
        isActive: { $ne: false }
      }).select('_id connectedAccounts');

      let totalSynced = 0;
      let totalErrors = 0;

      for (const user of users) {
        try {
          const platforms = [...new Set(user.connectedAccounts.map(acc => acc.platform))];
          
          for (const platform of platforms) {
            const result = await analyticsService.syncAnalyticsData(user._id.toString(), platform);
            
            if (result.success) {
              totalSynced += result.data.successfulSyncs || 0;
            } else {
              totalErrors++;
              logger.warn(`Failed to sync ${platform} analytics for user ${user._id}:`, result.error);
            }
          }
        } catch (error) {
          totalErrors++;
          logger.error(`Error syncing analytics for user ${user._id}:`, error);
        }
      }

      logger.info(`Scheduled analytics sync completed`, {
        usersProcessed: users.length,
        totalSynced,
        totalErrors
      });
    } catch (error) {
      logger.error('Error in scheduled analytics sync:', error);
    }
  }

  /**
   * Perform daily analytics aggregation
   */
  async performDailyAggregation() {
    try {
      logger.info('Starting daily analytics aggregation');

      const Analytics = require('../models/Analytics');
      
      // Get yesterday's date range
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // Aggregate analytics data by user and platform
      const aggregationPipeline = [
        {
          $match: {
            timestamp: {
              $gte: yesterday,
              $lt: today
            },
            isActive: true
          }
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              platform: '$platform',
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$timestamp'
                }
              }
            },
            totalViews: { $sum: '$metrics.views' },
            totalLikes: { $sum: '$metrics.likes' },
            totalComments: { $sum: '$metrics.comments' },
            totalShares: { $sum: '$metrics.shares' },
            totalSaves: { $sum: '$metrics.saves' },
            totalImpressions: { $sum: '$metrics.impressions' },
            totalReach: { $sum: '$metrics.reach' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            contentCount: { $sum: 1 },
            lastUpdated: { $max: '$syncedAt' }
          }
        }
      ];

      const aggregatedData = await Analytics.aggregate(aggregationPipeline);
      
      logger.info(`Daily aggregation completed`, {
        date: yesterday.toISOString().split('T')[0],
        recordsProcessed: aggregatedData.length
      });

      // Store aggregated data (could be stored in a separate collection if needed)
      // For now, we'll just log the results
      
    } catch (error) {
      logger.error('Error in daily analytics aggregation:', error);
    }
  }

  /**
   * Perform weekly cleanup of old analytics data
   */
  async performWeeklyCleanup() {
    try {
      logger.info('Starting weekly analytics cleanup');

      const Analytics = require('../models/Analytics');
      
      // Remove analytics data older than 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const deleteResult = await Analytics.deleteMany({
        timestamp: { $lt: cutoffDate },
        isActive: false
      });

      // Remove duplicate analytics entries (keep the latest)
      const duplicatesPipeline = [
        {
          $group: {
            _id: {
              userId: '$userId',
              platform: '$platform',
              mediaId: '$mediaId'
            },
            docs: { $push: '$_id' },
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ];

      const duplicates = await Analytics.aggregate(duplicatesPipeline);
      let duplicatesRemoved = 0;

      for (const duplicate of duplicates) {
        // Keep the first document, remove the rest
        const docsToRemove = duplicate.docs.slice(1);
        await Analytics.deleteMany({ _id: { $in: docsToRemove } });
        duplicatesRemoved += docsToRemove.length;
      }

      logger.info(`Weekly cleanup completed`, {
        oldRecordsRemoved: deleteResult.deletedCount,
        duplicatesRemoved
      });
    } catch (error) {
      logger.error('Error in weekly analytics cleanup:', error);
    }
  }

  /**
   * Manually trigger analytics sync for specific user
   * @param {string} userId - User ID
   * @param {string} platform - Platform (optional)
   * @returns {Object} Sync result
   */
  async triggerUserSync(userId, platform = null) {
    try {
      logger.info(`Manual analytics sync triggered for user ${userId}`, { platform });

      if (platform) {
        return await analyticsService.syncAnalyticsData(userId, platform);
      } else {
        // Sync all platforms for the user
        const user = await User.findById(userId).select('connectedAccounts');
        if (!user) {
          throw new Error('User not found');
        }

        const platforms = [...new Set(user.connectedAccounts.map(acc => acc.platform))];
        const results = [];

        for (const p of platforms) {
          const result = await analyticsService.syncAnalyticsData(userId, p);
          results.push({ platform: p, ...result });
        }

        return {
          success: true,
          data: {
            results,
            totalPlatforms: platforms.length,
            successfulSyncs: results.filter(r => r.success).length
          }
        };
      }
    } catch (error) {
      logger.error(`Error in manual user sync for ${userId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get analytics sync statistics
   * @returns {Object} Sync statistics
   */
  async getSyncStatistics() {
    try {
      const Analytics = require('../models/Analytics');
      
      const stats = await Analytics.aggregate([
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            totalUsers: { $addToSet: '$userId' },
            totalPlatforms: { $addToSet: '$platform' },
            latestSync: { $max: '$syncedAt' },
            oldestRecord: { $min: '$timestamp' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            totalViews: { $sum: '$metrics.views' },
            totalEngagement: {
              $sum: {
                $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares', '$metrics.saves']
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalRecords: 1,
            uniqueUsers: { $size: '$totalUsers' },
            platforms: '$totalPlatforms',
            latestSync: 1,
            oldestRecord: 1,
            avgEngagementRate: { $round: ['$avgEngagementRate', 2] },
            totalViews: 1,
            totalEngagement: 1
          }
        }
      ]);

      // Get platform breakdown
      const platformStats = await Analytics.aggregate([
        {
          $group: {
            _id: '$platform',
            recordCount: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' },
            totalViews: { $sum: '$metrics.views' },
            latestSync: { $max: '$syncedAt' }
          }
        },
        {
          $project: {
            platform: '$_id',
            _id: 0,
            recordCount: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            avgEngagementRate: { $round: ['$avgEngagementRate', 2] },
            totalViews: 1,
            latestSync: 1
          }
        },
        {
          $sort: { recordCount: -1 }
        }
      ]);

      return {
        success: true,
        data: {
          overall: stats[0] || {
            totalRecords: 0,
            uniqueUsers: 0,
            platforms: [],
            latestSync: null,
            oldestRecord: null,
            avgEngagementRate: 0,
            totalViews: 0,
            totalEngagement: 0
          },
          platformBreakdown: platformStats,
          schedulerStatus: this.getStatus()
        }
      };
    } catch (error) {
      logger.error('Error getting sync statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AnalyticsScheduler();