const cron = require('node-cron');
const logger = require('../config/logger');
const socialMediaService = require('./socialMediaService');
const Trend = require('../models/Trend');

class TrendScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  // Start all scheduled jobs
  start() {
    if (this.isRunning) {
      logger.warn('Trend scheduler is already running');
      return;
    }

    logger.info('Starting trend scheduler...');

    // Schedule trend fetching every 2 hours
    this.scheduleJob('fetchTrends', '0 */2 * * *', async () => {
      await this.fetchAllTrends();
    });

    // Schedule trend cleanup every day at 2 AM
    this.scheduleJob('cleanupTrends', '0 2 * * *', async () => {
      await this.cleanupExpiredTrends();
    });

    // Schedule trend scoring update every 6 hours
    this.scheduleJob('updateTrendScores', '0 */6 * * *', async () => {
      await this.updateTrendScores();
    });

    // Schedule niche-specific trend fetching every 4 hours
    this.scheduleJob('fetchNicheTrends', '0 */4 * * *', async () => {
      await this.fetchNicheTrends();
    });

    this.isRunning = true;
    logger.info('Trend scheduler started successfully');
  }

  // Stop all scheduled jobs
  stop() {
    if (!this.isRunning) {
      logger.warn('Trend scheduler is not running');
      return;
    }

    logger.info('Stopping trend scheduler...');

    for (const [jobName, job] of this.jobs) {
      job.stop();
      logger.info(`Stopped job: ${jobName}`);
    }

    this.jobs.clear();
    this.isRunning = false;
    logger.info('Trend scheduler stopped');
  }

  // Schedule a new job
  scheduleJob(name, cronExpression, task) {
    if (this.jobs.has(name)) {
      logger.warn(`Job ${name} already exists, stopping previous instance`);
      this.jobs.get(name).stop();
    }

    const job = cron.schedule(cronExpression, async () => {
      logger.info(`Starting scheduled job: ${name}`);
      const startTime = Date.now();

      try {
        await task();
        const duration = Date.now() - startTime;
        logger.info(`Completed scheduled job: ${name} in ${duration}ms`);
      } catch (error) {
        logger.error(`Error in scheduled job ${name}:`, error);
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    job.start();
    this.jobs.set(name, job);
    logger.info(`Scheduled job: ${name} with cron expression: ${cronExpression}`);
  }

  // Fetch trends from all platforms
  async fetchAllTrends() {
    try {
      logger.info('Starting scheduled trend fetching for all platforms');
      
      const trends = await socialMediaService.fetchAndStoreTrends();
      
      logger.info(`Scheduled trend fetch completed. Processed ${trends.length} trends`);
      return trends;
    } catch (error) {
      logger.error('Error in scheduled trend fetching:', error);
      throw error;
    }
  }

  // Fetch trends for specific niches
  async fetchNicheTrends() {
    try {
      logger.info('Starting niche-specific trend fetching');
      
      const popularNiches = [
        'fitness', 'beauty', 'food', 'travel', 'tech', 
        'lifestyle', 'entertainment', 'education'
      ];

      const allTrends = [];
      
      for (const niche of popularNiches) {
        try {
          logger.info(`Fetching trends for niche: ${niche}`);
          const nicheTrends = await socialMediaService.fetchAndStoreTrends(niche);
          allTrends.push(...nicheTrends);
          
          // Add delay between niche fetches to avoid rate limiting
          await this.delay(2000);
        } catch (error) {
          logger.error(`Error fetching trends for niche ${niche}:`, error);
        }
      }

      logger.info(`Niche trend fetch completed. Processed ${allTrends.length} trends`);
      return allTrends;
    } catch (error) {
      logger.error('Error in niche trend fetching:', error);
      throw error;
    }
  }

  // Clean up expired trends
  async cleanupExpiredTrends() {
    try {
      logger.info('Starting trend cleanup process');
      
      const result = await Trend.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false },
          { createdAt: { $lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } // Older than 14 days
        ]
      });

      logger.info(`Trend cleanup completed. Removed ${result.deletedCount} expired trends`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error in trend cleanup:', error);
      throw error;
    }
  }

  // Update trend scores based on current metrics
  async updateTrendScores() {
    try {
      logger.info('Starting trend score update process');
      
      const trends = await Trend.find({ 
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      let updatedCount = 0;
      
      for (const trend of trends) {
        const newScore = trend.calculateTrendScore();
        
        if (Math.abs(trend.relevanceScore - newScore) > 5) { // Only update if significant change
          trend.relevanceScore = newScore;
          await trend.save();
          updatedCount++;
        }
      }

      logger.info(`Trend score update completed. Updated ${updatedCount} trends`);
      return updatedCount;
    } catch (error) {
      logger.error('Error updating trend scores:', error);
      throw error;
    }
  }

  // Get scheduler status
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }

  // Manual trigger for trend fetching
  async triggerTrendFetch(platform = null, niche = null) {
    try {
      logger.info('Manual trend fetch triggered', { platform, niche });
      
      let trends;
      if (platform) {
        // Fetch from specific platform
        switch (platform.toLowerCase()) {
          case 'instagram':
            trends = await socialMediaService.fetchInstagramTrends(niche);
            break;
          case 'tiktok':
            trends = await socialMediaService.fetchTikTokTrends(niche);
            break;
          case 'youtube':
            trends = await socialMediaService.fetchYouTubeTrends(niche);
            break;
          default:
            throw new Error(`Unsupported platform: ${platform}`);
        }
        
        trends = await socialMediaService.storeTrends(trends);
      } else {
        // Fetch from all platforms
        trends = await socialMediaService.fetchAndStoreTrends(niche);
      }

      logger.info(`Manual trend fetch completed. Processed ${trends.length} trends`);
      return trends;
    } catch (error) {
      logger.error('Error in manual trend fetch:', error);
      throw error;
    }
  }

  // Utility method for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get trend statistics
  async getTrendStatistics() {
    try {
      const stats = await Trend.aggregate([
        {
          $match: {
            isActive: true,
            expiresAt: { $gt: new Date() }
          }
        },
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 },
            avgRelevanceScore: { $avg: '$relevanceScore' },
            totalViews: { $sum: '$metrics.views' },
            avgEngagementRate: { $avg: '$metrics.engagementRate' }
          }
        }
      ]);

      const totalTrends = await Trend.countDocuments({
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      return {
        totalTrends,
        platformStats: stats,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Error getting trend statistics:', error);
      throw error;
    }
  }
}

module.exports = new TrendScheduler();