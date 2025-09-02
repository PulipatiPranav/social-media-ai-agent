const Analytics = require('../models/Analytics');
const Content = require('../models/Content');
const User = require('../models/User');
const logger = require('../config/logger');
const axios = require('axios');
const mongoose = require('mongoose');

class AnalyticsService {
  constructor() {
    this.syncIntervals = new Map(); // Store sync intervals for different users
  }

  /**
   * Get comprehensive user analytics summary
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Analytics summary
   */
  async getUserAnalyticsSummary(userId, options = {}) {
    try {
      const {
        platform,
        startDate,
        endDate,
        groupBy = 'day',
        limit = 100
      } = options;

      logger.info('Getting user analytics summary', { userId, platform, startDate, endDate });

      // Get overall summary
      const summary = await Analytics.getUserAnalyticsSummary(userId, {
        platform,
        startDate,
        endDate,
        limit
      });

      // Get platform breakdown if no specific platform requested
      let platformBreakdown = [];
      if (!platform) {
        const platforms = ['instagram', 'tiktok', 'youtube'];
        platformBreakdown = await Promise.all(
          platforms.map(async (p) => {
            const platformSummary = await Analytics.getUserAnalyticsSummary(userId, {
              platform: p,
              startDate,
              endDate,
              limit
            });
            return {
              platform: p,
              ...platformSummary
            };
          })
        );
      }

      // Get time-series data
      const timeSeriesData = platform ? 
        await Analytics.getPlatformAnalytics(userId, platform, { startDate, endDate, groupBy, limit }) :
        await this.getAggregatedTimeSeriesData(userId, { startDate, endDate, groupBy, limit });

      // Get top performing content
      const topContent = await this.getTopPerformingContent(userId, { platform, startDate, endDate, limit: 10 });

      // Calculate growth metrics
      const growthMetrics = await this.calculateGrowthMetrics(userId, { platform, startDate, endDate });

      return {
        success: true,
        data: {
          summary,
          platformBreakdown,
          timeSeriesData,
          topContent,
          growthMetrics,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error('Error getting user analytics summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get analytics for specific content piece
   * @param {string} userId - User ID
   * @param {string} contentId - Content ID
   * @returns {Object} Content analytics
   */
  async getContentAnalytics(userId, contentId) {
    try {
      logger.info('Getting content analytics', { userId, contentId });

      const contentAnalytics = await Analytics.getContentPerformance(userId, contentId);
      
      if (!contentAnalytics || contentAnalytics.length === 0) {
        return {
          success: false,
          error: 'No analytics data found for this content'
        };
      }

      // Get content details
      const content = await Content.findById(contentId);
      if (!content) {
        return {
          success: false,
          error: 'Content not found'
        };
      }

      // Calculate performance scores
      const performanceScores = this.calculatePerformanceScores(contentAnalytics);

      // Get similar content performance for comparison
      const similarContent = await this.getSimilarContentPerformance(userId, content);

      return {
        success: true,
        data: {
          content: {
            id: content._id,
            title: content.title,
            type: content.type,
            platforms: content.platforms,
            createdAt: content.createdAt
          },
          analytics: contentAnalytics,
          performanceScores,
          similarContent,
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      logger.error('Error getting content analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync analytics data from social media platforms
   * @param {string} userId - User ID
   * @param {string} platform - Platform to sync
   * @param {string} accountId - Account ID (optional)
   * @returns {Object} Sync result
   */
  async syncAnalyticsData(userId, platform, accountId = null) {
    try {
      logger.info('Syncing analytics data', { userId, platform, accountId });

      // Get user's connected accounts
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      const connectedAccounts = user.connectedAccounts.filter(account => 
        account.platform === platform && (accountId ? account.accountId === accountId : true)
      );

      if (connectedAccounts.length === 0) {
        return {
          success: false,
          error: `No connected ${platform} accounts found`
        };
      }

      let syncResults = [];

      for (const account of connectedAccounts) {
        try {
          const syncResult = await this.syncAccountAnalytics(userId, platform, account);
          syncResults.push(syncResult);
        } catch (error) {
          logger.error(`Error syncing account ${account.accountId}:`, error);
          syncResults.push({
            accountId: account.accountId,
            success: false,
            error: error.message
          });
        }
      }

      const successfulSyncs = syncResults.filter(result => result.success);
      const failedSyncs = syncResults.filter(result => !result.success);

      return {
        success: true,
        data: {
          totalAccounts: connectedAccounts.length,
          successfulSyncs: successfulSyncs.length,
          failedSyncs: failedSyncs.length,
          results: syncResults,
          lastSyncAt: new Date()
        }
      };
    } catch (error) {
      logger.error('Error syncing analytics data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync analytics for a specific account
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {Object} account - Account object
   * @returns {Object} Sync result
   */
  async syncAccountAnalytics(userId, platform, account) {
    try {
      let analyticsData = [];

      switch (platform) {
        case 'instagram':
          analyticsData = await this.fetchInstagramAnalytics(account);
          break;
        case 'tiktok':
          analyticsData = await this.fetchTikTokAnalytics(account);
          break;
        case 'youtube':
          analyticsData = await this.fetchYouTubeAnalytics(account);
          break;
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Store analytics data
      const storedAnalytics = await this.storeAnalyticsData(userId, platform, account.accountId, analyticsData);

      return {
        accountId: account.accountId,
        success: true,
        data: {
          itemsProcessed: analyticsData.length,
          itemsStored: storedAnalytics.length,
          lastSyncAt: new Date()
        }
      };
    } catch (error) {
      logger.error(`Error syncing ${platform} analytics for account ${account.accountId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch Instagram analytics data
   * @param {Object} account - Instagram account
   * @returns {Array} Analytics data
   */
  async fetchInstagramAnalytics(account) {
    try {
      const { accessToken, accountId } = account;
      
      // Get account insights
      const accountInsightsUrl = `https://graph.facebook.com/v18.0/${accountId}/insights`;
      const accountParams = {
        metric: 'impressions,reach,profile_views,website_clicks',
        period: 'day',
        since: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000), // Last 30 days
        until: Math.floor(Date.now() / 1000),
        access_token: accessToken
      };

      const accountResponse = await axios.get(accountInsightsUrl, { params: accountParams });
      
      // Get media insights
      const mediaUrl = `https://graph.facebook.com/v18.0/${accountId}/media`;
      const mediaParams = {
        fields: 'id,media_type,media_url,permalink,timestamp,caption,insights.metric(impressions,reach,likes,comments,shares,saves)',
        limit: 100,
        access_token: accessToken
      };

      const mediaResponse = await axios.get(mediaUrl, { params: mediaParams });
      
      const analyticsData = [];

      // Process media insights
      if (mediaResponse.data && mediaResponse.data.data) {
        for (const media of mediaResponse.data.data) {
          if (media.insights && media.insights.data) {
            const metrics = {};
            
            media.insights.data.forEach(insight => {
              metrics[insight.name] = insight.values[0]?.value || 0;
            });

            analyticsData.push({
              mediaId: media.id,
              mediaType: media.media_type.toLowerCase(),
              timestamp: new Date(media.timestamp),
              metrics: {
                views: metrics.impressions || 0,
                likes: metrics.likes || 0,
                comments: metrics.comments || 0,
                shares: metrics.shares || 0,
                saves: metrics.saves || 0,
                impressions: metrics.impressions || 0,
                reach: metrics.reach || 0,
                engagementRate: this.calculateEngagementRate(metrics)
              },
              platformSpecific: {
                permalink: media.permalink,
                caption: media.caption,
                mediaUrl: media.media_url
              }
            });
          }
        }
      }

      return analyticsData;
    } catch (error) {
      logger.error('Error fetching Instagram analytics:', error);
      throw error;
    }
  }

  /**
   * Fetch TikTok analytics data
   * @param {Object} account - TikTok account
   * @returns {Array} Analytics data
   */
  async fetchTikTokAnalytics(account) {
    try {
      const { accessToken, accountId } = account;
      
      // Get user info and videos
      const userInfoUrl = 'https://open-api.tiktok.com/v2/user/info/';
      const userParams = {
        access_token: accessToken,
        fields: 'open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count'
      };

      const userResponse = await axios.post(userInfoUrl, userParams);

      // Get video list
      const videoListUrl = 'https://open-api.tiktok.com/v2/video/list/';
      const videoParams = {
        access_token: accessToken,
        fields: 'id,title,video_description,duration,cover_image_url,embed_link,like_count,comment_count,share_count,view_count'
      };

      const videoResponse = await axios.post(videoListUrl, videoParams);
      
      const analyticsData = [];

      if (videoResponse.data && videoResponse.data.data && videoResponse.data.data.videos) {
        for (const video of videoResponse.data.data.videos) {
          analyticsData.push({
            mediaId: video.id,
            mediaType: 'video',
            timestamp: new Date(), // TikTok API doesn't provide creation timestamp in this endpoint
            metrics: {
              views: video.view_count || 0,
              likes: video.like_count || 0,
              comments: video.comment_count || 0,
              shares: video.share_count || 0,
              saves: 0, // Not available in TikTok API
              impressions: video.view_count || 0,
              reach: video.view_count || 0,
              engagementRate: this.calculateEngagementRate({
                likes: video.like_count,
                comments: video.comment_count,
                shares: video.share_count,
                impressions: video.view_count
              })
            },
            platformSpecific: {
              title: video.title,
              description: video.video_description,
              duration: video.duration,
              coverImageUrl: video.cover_image_url,
              embedLink: video.embed_link
            }
          });
        }
      }

      return analyticsData;
    } catch (error) {
      logger.error('Error fetching TikTok analytics:', error);
      throw error;
    }
  }

  /**
   * Fetch YouTube analytics data
   * @param {Object} account - YouTube account
   * @returns {Array} Analytics data
   */
  async fetchYouTubeAnalytics(account) {
    try {
      const { accessToken, accountId } = account;
      
      // Get channel videos
      const videosUrl = 'https://www.googleapis.com/youtube/v3/search';
      const videosParams = {
        part: 'id,snippet',
        channelId: accountId,
        maxResults: 50,
        order: 'date',
        type: 'video',
        access_token: accessToken
      };

      const videosResponse = await axios.get(videosUrl, { params: videosParams });
      
      const analyticsData = [];

      if (videosResponse.data && videosResponse.data.items) {
        // Get video statistics for each video
        const videoIds = videosResponse.data.items.map(item => item.id.videoId).join(',');
        
        const statsUrl = 'https://www.googleapis.com/youtube/v3/videos';
        const statsParams = {
          part: 'statistics,contentDetails',
          id: videoIds,
          access_token: accessToken
        };

        const statsResponse = await axios.get(statsUrl, { params: statsParams });

        if (statsResponse.data && statsResponse.data.items) {
          for (let i = 0; i < videosResponse.data.items.length; i++) {
            const video = videosResponse.data.items[i];
            const stats = statsResponse.data.items.find(item => item.id === video.id.videoId);
            
            if (stats && stats.statistics) {
              const metrics = {
                views: parseInt(stats.statistics.viewCount) || 0,
                likes: parseInt(stats.statistics.likeCount) || 0,
                comments: parseInt(stats.statistics.commentCount) || 0,
                shares: 0, // Not available in YouTube API
                saves: 0, // Not available in YouTube API
                impressions: parseInt(stats.statistics.viewCount) || 0,
                reach: parseInt(stats.statistics.viewCount) || 0
              };

              analyticsData.push({
                mediaId: video.id.videoId,
                mediaType: 'video',
                timestamp: new Date(video.snippet.publishedAt),
                metrics: {
                  ...metrics,
                  engagementRate: this.calculateEngagementRate(metrics)
                },
                platformSpecific: {
                  title: video.snippet.title,
                  description: video.snippet.description,
                  thumbnailUrl: video.snippet.thumbnails?.high?.url,
                  duration: stats.contentDetails?.duration,
                  channelTitle: video.snippet.channelTitle
                }
              });
            }
          }
        }
      }

      return analyticsData;
    } catch (error) {
      logger.error('Error fetching YouTube analytics:', error);
      throw error;
    }
  }

  /**
   * Store analytics data in database
   * @param {string} userId - User ID
   * @param {string} platform - Platform
   * @param {string} accountId - Account ID
   * @param {Array} analyticsData - Analytics data to store
   * @returns {Array} Stored analytics
   */
  async storeAnalyticsData(userId, platform, accountId, analyticsData) {
    try {
      const storedAnalytics = [];

      for (const data of analyticsData) {
        // Check if analytics already exists
        const existingAnalytics = await Analytics.findByMediaId(userId, platform, data.mediaId);

        if (existingAnalytics) {
          // Update existing analytics
          await existingAnalytics.updateMetrics(data.metrics);
          await existingAnalytics.calculateGrowthRates();
          storedAnalytics.push(existingAnalytics);
        } else {
          // Create new analytics entry
          const newAnalytics = new Analytics({
            userId,
            platform,
            accountId,
            mediaId: data.mediaId,
            mediaType: data.mediaType,
            metrics: data.metrics,
            timestamp: data.timestamp,
            platformSpecific: data.platformSpecific || {}
          });

          await newAnalytics.save();
          await newAnalytics.calculateGrowthRates();
          storedAnalytics.push(newAnalytics);
        }
      }

      return storedAnalytics;
    } catch (error) {
      logger.error('Error storing analytics data:', error);
      throw error;
    }
  }

  /**
   * Calculate engagement rate
   * @param {Object} metrics - Metrics object
   * @returns {number} Engagement rate
   */
  calculateEngagementRate(metrics) {
    const { likes = 0, comments = 0, shares = 0, saves = 0, impressions = 0 } = metrics;
    const totalEngagement = likes + comments + shares + saves;
    
    if (impressions > 0) {
      return parseFloat(((totalEngagement / impressions) * 100).toFixed(2));
    }
    
    return 0;
  }

  /**
   * Get aggregated time series data across all platforms
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Time series data
   */
  async getAggregatedTimeSeriesData(userId, options = {}) {
    try {
      const { startDate, endDate, groupBy = 'day', limit = 30 } = options;
      const platforms = ['instagram', 'tiktok', 'youtube'];

      const timeSeriesData = await Promise.all(
        platforms.map(async (platform) => {
          const data = await Analytics.getPlatformAnalytics(userId, platform, {
            startDate,
            endDate,
            groupBy,
            limit
          });
          return { platform, data };
        })
      );

      // Aggregate data by date
      const aggregatedData = new Map();

      timeSeriesData.forEach(({ platform, data }) => {
        data.forEach(item => {
          const dateKey = item.date.toISOString().split('T')[0];
          
          if (!aggregatedData.has(dateKey)) {
            aggregatedData.set(dateKey, {
              date: item.date,
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              saves: 0,
              impressions: 0,
              reach: 0,
              contentCount: 0,
              platforms: new Set()
            });
          }

          const existing = aggregatedData.get(dateKey);
          existing.views += item.views;
          existing.likes += item.likes;
          existing.comments += item.comments;
          existing.shares += item.shares;
          existing.saves += item.saves;
          existing.impressions += item.impressions;
          existing.reach += item.reach;
          existing.contentCount += item.contentCount;
          existing.platforms.add(platform);
        });
      });

      // Convert to array and calculate engagement rates
      return Array.from(aggregatedData.values())
        .map(item => ({
          ...item,
          platforms: Array.from(item.platforms),
          totalEngagement: item.likes + item.comments + item.shares + item.saves,
          avgEngagementRate: item.impressions > 0 ? 
            parseFloat(((item.likes + item.comments + item.shares + item.saves) / item.impressions * 100).toFixed(2)) : 0
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    } catch (error) {
      logger.error('Error getting aggregated time series data:', error);
      throw error;
    }
  }

  /**
   * Get top performing content
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Array} Top performing content
   */
  async getTopPerformingContent(userId, options = {}) {
    try {
      const { platform, startDate, endDate, limit = 10 } = options;

      let matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true
      };

      if (platform) {
        matchStage.platform = platform;
      }

      if (startDate || endDate) {
        matchStage.timestamp = {};
        if (startDate) matchStage.timestamp.$gte = new Date(startDate);
        if (endDate) matchStage.timestamp.$lte = new Date(endDate);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $addFields: {
            totalEngagement: {
              $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares', '$metrics.saves']
            }
          }
        },
        { $sort: { totalEngagement: -1, 'metrics.views': -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'contents',
            localField: 'contentId',
            foreignField: '_id',
            as: 'content'
          }
        },
        {
          $project: {
            platform: 1,
            mediaId: 1,
            mediaType: 1,
            metrics: 1,
            totalEngagement: 1,
            timestamp: 1,
            content: { $arrayElemAt: ['$content', 0] },
            platformSpecific: 1
          }
        }
      ];

      return await Analytics.aggregate(pipeline);
    } catch (error) {
      logger.error('Error getting top performing content:', error);
      throw error;
    }
  }

  /**
   * Calculate growth metrics
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Object} Growth metrics
   */
  async calculateGrowthMetrics(userId, options = {}) {
    try {
      const { platform, startDate, endDate } = options;
      
      const currentPeriodEnd = endDate ? new Date(endDate) : new Date();
      const currentPeriodStart = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const periodLength = currentPeriodEnd - currentPeriodStart;
      const previousPeriodEnd = new Date(currentPeriodStart.getTime() - 1);
      const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);

      // Get current period metrics
      const currentMetrics = await Analytics.getUserAnalyticsSummary(userId, {
        platform,
        startDate: currentPeriodStart,
        endDate: currentPeriodEnd
      });

      // Get previous period metrics
      const previousMetrics = await Analytics.getUserAnalyticsSummary(userId, {
        platform,
        startDate: previousPeriodStart,
        endDate: previousPeriodEnd
      });

      // Calculate growth rates
      const calculateGrowthRate = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return parseFloat((((current - previous) / previous) * 100).toFixed(2));
      };

      return {
        viewsGrowth: calculateGrowthRate(currentMetrics.totalViews, previousMetrics.totalViews),
        likesGrowth: calculateGrowthRate(currentMetrics.totalLikes, previousMetrics.totalLikes),
        commentsGrowth: calculateGrowthRate(currentMetrics.totalComments, previousMetrics.totalComments),
        sharesGrowth: calculateGrowthRate(currentMetrics.totalShares, previousMetrics.totalShares),
        engagementGrowth: calculateGrowthRate(currentMetrics.avgEngagementRate, previousMetrics.avgEngagementRate),
        contentGrowth: calculateGrowthRate(currentMetrics.contentCount, previousMetrics.contentCount),
        currentPeriod: {
          start: currentPeriodStart,
          end: currentPeriodEnd,
          metrics: currentMetrics
        },
        previousPeriod: {
          start: previousPeriodStart,
          end: previousPeriodEnd,
          metrics: previousMetrics
        }
      };
    } catch (error) {
      logger.error('Error calculating growth metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate performance scores for content
   * @param {Array} contentAnalytics - Content analytics data
   * @returns {Object} Performance scores
   */
  calculatePerformanceScores(contentAnalytics) {
    try {
      let totalViews = 0;
      let totalEngagement = 0;
      let totalImpressions = 0;
      let platformCount = 0;

      contentAnalytics.forEach(analytics => {
        const metrics = analytics.latestMetrics;
        totalViews += metrics.views || 0;
        totalEngagement += (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0) + (metrics.saves || 0);
        totalImpressions += metrics.impressions || 0;
        platformCount++;
      });

      const avgEngagementRate = totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0;

      // Calculate performance scores (0-100)
      const viewsScore = Math.min(100, Math.log10(totalViews + 1) * 20);
      const engagementScore = Math.min(100, avgEngagementRate * 2);
      const reachScore = Math.min(100, Math.log10(totalImpressions + 1) * 15);
      const crossPlatformScore = (platformCount / 3) * 100; // Assuming max 3 platforms

      const overallScore = (viewsScore + engagementScore + reachScore + crossPlatformScore) / 4;

      return {
        overall: parseFloat(overallScore.toFixed(1)),
        views: parseFloat(viewsScore.toFixed(1)),
        engagement: parseFloat(engagementScore.toFixed(1)),
        reach: parseFloat(reachScore.toFixed(1)),
        crossPlatform: parseFloat(crossPlatformScore.toFixed(1)),
        metrics: {
          totalViews,
          totalEngagement,
          totalImpressions,
          avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
          platformCount
        }
      };
    } catch (error) {
      logger.error('Error calculating performance scores:', error);
      return {
        overall: 0,
        views: 0,
        engagement: 0,
        reach: 0,
        crossPlatform: 0,
        metrics: {
          totalViews: 0,
          totalEngagement: 0,
          totalImpressions: 0,
          avgEngagementRate: 0,
          platformCount: 0
        }
      };
    }
  }

  /**
   * Get similar content performance for comparison
   * @param {string} userId - User ID
   * @param {Object} content - Content object
   * @returns {Array} Similar content performance
   */
  async getSimilarContentPerformance(userId, content) {
    try {
      // Find similar content based on type and platforms
      const similarContent = await Content.find({
        userId: new mongoose.Types.ObjectId(userId),
        _id: { $ne: content._id },
        type: content.type,
        platforms: { $in: content.platforms }
      }).limit(5);

      const similarPerformance = [];

      for (const similar of similarContent) {
        const analytics = await Analytics.getContentPerformance(userId, similar._id);
        if (analytics && analytics.length > 0) {
          const performanceScores = this.calculatePerformanceScores(analytics);
          similarPerformance.push({
            contentId: similar._id,
            title: similar.title,
            performanceScores,
            createdAt: similar.createdAt
          });
        }
      }

      return similarPerformance.sort((a, b) => b.performanceScores.overall - a.performanceScores.overall);
    } catch (error) {
      logger.error('Error getting similar content performance:', error);
      return [];
    }
  }

  /**
   * Start automatic analytics sync for user
   * @param {string} userId - User ID
   * @param {number} intervalMinutes - Sync interval in minutes (default: 60)
   */
  startAutoSync(userId, intervalMinutes = 60) {
    try {
      // Clear existing interval if any
      this.stopAutoSync(userId);

      const intervalId = setInterval(async () => {
        try {
          logger.info(`Auto-syncing analytics for user ${userId}`);
          
          const platforms = ['instagram', 'tiktok', 'youtube'];
          for (const platform of platforms) {
            await this.syncAnalyticsData(userId, platform);
          }
          
          logger.info(`Auto-sync completed for user ${userId}`);
        } catch (error) {
          logger.error(`Auto-sync failed for user ${userId}:`, error);
        }
      }, intervalMinutes * 60 * 1000);

      this.syncIntervals.set(userId, intervalId);
      logger.info(`Auto-sync started for user ${userId} with ${intervalMinutes} minute interval`);
    } catch (error) {
      logger.error(`Error starting auto-sync for user ${userId}:`, error);
    }
  }

  /**
   * Stop automatic analytics sync for user
   * @param {string} userId - User ID
   */
  stopAutoSync(userId) {
    try {
      const intervalId = this.syncIntervals.get(userId);
      if (intervalId) {
        clearInterval(intervalId);
        this.syncIntervals.delete(userId);
        logger.info(`Auto-sync stopped for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error stopping auto-sync for user ${userId}:`, error);
    }
  }

  /**
   * Get sync status for user
   * @param {string} userId - User ID
   * @returns {Object} Sync status
   */
  getSyncStatus(userId) {
    return {
      isAutoSyncActive: this.syncIntervals.has(userId),
      activeIntervals: this.syncIntervals.size
    };
  }
}

module.exports = new AnalyticsService();