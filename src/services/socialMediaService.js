const axios = require('axios');
const logger = require('../config/logger');
const Trend = require('../models/Trend');

class SocialMediaService {
  constructor() {
    this.instagramClient = this.createInstagramClient();
    this.tiktokClient = this.createTikTokClient();
    this.youtubeClient = this.createYouTubeClient();
  }

  createInstagramClient() {
    return axios.create({
      baseURL: 'https://graph.instagram.com/v18.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  createTikTokClient() {
    return axios.create({
      baseURL: 'https://open-api.tiktok.com/v1.3',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  createYouTubeClient() {
    return axios.create({
      baseURL: 'https://www.googleapis.com/youtube/v3',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Instagram trend fetching (using hashtag and discovery APIs)
  async fetchInstagramTrends(niche = null) {
    try {
      logger.info('Fetching Instagram trends', { niche });
      
      // Mock implementation - In production, this would use Instagram Graph API
      // Currently Instagram doesn't provide public trending API, so we simulate with popular hashtags
      const mockTrends = this.generateMockInstagramTrends(niche);
      
      const trends = [];
      for (const trendData of mockTrends) {
        const trend = await this.normalizeTrendData('instagram', trendData);
        trends.push(trend);
      }

      logger.info(`Fetched ${trends.length} Instagram trends`);
      return trends;
    } catch (error) {
      logger.error('Error fetching Instagram trends:', error);
      throw new Error('Failed to fetch Instagram trends');
    }
  }

  // TikTok trend fetching
  async fetchTikTokTrends(niche = null) {
    try {
      logger.info('Fetching TikTok trends', { niche });
      
      // Mock implementation - In production, this would use TikTok API
      const mockTrends = this.generateMockTikTokTrends(niche);
      
      const trends = [];
      for (const trendData of mockTrends) {
        const trend = await this.normalizeTrendData('tiktok', trendData);
        trends.push(trend);
      }

      logger.info(`Fetched ${trends.length} TikTok trends`);
      return trends;
    } catch (error) {
      logger.error('Error fetching TikTok trends:', error);
      throw new Error('Failed to fetch TikTok trends');
    }
  }

  // YouTube trend fetching
  async fetchYouTubeTrends(niche = null) {
    try {
      logger.info('Fetching YouTube trends', { niche });
      
      if (!process.env.YOUTUBE_API_KEY) {
        logger.warn('YouTube API key not configured, using mock data');
        const mockTrends = this.generateMockYouTubeTrends(niche);
        const trends = [];
        for (const trendData of mockTrends) {
          const trend = await this.normalizeTrendData('youtube', trendData);
          trends.push(trend);
        }
        return trends;
      }

      const response = await this.youtubeClient.get('/videos', {
        params: {
          part: 'snippet,statistics',
          chart: 'mostPopular',
          regionCode: 'US',
          maxResults: 50,
          key: process.env.YOUTUBE_API_KEY
        }
      });

      const trends = [];
      for (const video of response.data.items) {
        const trendData = {
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          hashtags: this.extractHashtags(video.snippet.description),
          metrics: {
            views: parseInt(video.statistics.viewCount) || 0,
            likes: parseInt(video.statistics.likeCount) || 0,
            comments: parseInt(video.statistics.commentCount) || 0
          },
          thumbnailUrl: video.snippet.thumbnails?.high?.url,
          channelTitle: video.snippet.channelTitle,
          publishedAt: video.snippet.publishedAt
        };

        const trend = await this.normalizeTrendData('youtube', trendData);
        if (this.matchesNiche(trend, niche)) {
          trends.push(trend);
        }
      }

      logger.info(`Fetched ${trends.length} YouTube trends`);
      return trends;
    } catch (error) {
      logger.error('Error fetching YouTube trends:', error);
      throw new Error('Failed to fetch YouTube trends');
    }
  }

  // Normalize trend data from different platforms
  async normalizeTrendData(platform, rawData) {
    const trendId = `${platform}_${rawData.id}_${Date.now()}`;
    
    return {
      platform,
      trendId,
      title: rawData.title || '',
      description: rawData.description || '',
      hashtags: rawData.hashtags || [],
      audioTrack: rawData.audioTrack || {},
      metrics: {
        views: rawData.metrics?.views || 0,
        uses: rawData.metrics?.uses || 0,
        growth: rawData.metrics?.growth || 0,
        engagementRate: this.calculateEngagementRate(rawData.metrics)
      },
      niche: rawData.niche || this.detectNiche(rawData),
      relevanceScore: rawData.relevanceScore || this.calculateRelevanceScore(rawData),
      metadata: {
        originalUrl: rawData.originalUrl || '',
        thumbnailUrl: rawData.thumbnailUrl || '',
        duration: rawData.duration || 0,
        language: rawData.language || 'en',
        region: rawData.region || 'US'
      }
    };
  }

  // Calculate engagement rate from metrics
  calculateEngagementRate(metrics) {
    if (!metrics || !metrics.views || metrics.views === 0) return 0;
    
    const totalEngagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
    return (totalEngagement / metrics.views) * 100;
  }

  // Detect niche from content
  detectNiche(data) {
    const text = `${data.title} ${data.description}`.toLowerCase();
    const niches = [];

    const nicheKeywords = {
      fitness: ['workout', 'gym', 'fitness', 'exercise', 'health', 'training'],
      beauty: ['makeup', 'skincare', 'beauty', 'cosmetics', 'hair', 'style'],
      food: ['recipe', 'cooking', 'food', 'kitchen', 'chef', 'meal'],
      travel: ['travel', 'vacation', 'trip', 'destination', 'adventure'],
      tech: ['technology', 'tech', 'gadget', 'app', 'software', 'ai'],
      lifestyle: ['lifestyle', 'daily', 'routine', 'life', 'vlog'],
      entertainment: ['funny', 'comedy', 'entertainment', 'meme', 'viral'],
      education: ['learn', 'tutorial', 'education', 'how to', 'tips', 'guide']
    };

    for (const [niche, keywords] of Object.entries(nicheKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        niches.push(niche);
      }
    }

    return niches.length > 0 ? niches : ['general'];
  }

  // Calculate relevance score
  calculateRelevanceScore(data) {
    let score = 50; // Base score

    // Boost score based on engagement
    if (data.metrics?.engagementRate > 5) score += 20;
    else if (data.metrics?.engagementRate > 2) score += 10;

    // Boost score based on growth
    if (data.metrics?.growth > 1000) score += 15;
    else if (data.metrics?.growth > 100) score += 10;

    // Boost score based on views
    if (data.metrics?.views > 1000000) score += 15;
    else if (data.metrics?.views > 100000) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  // Check if trend matches niche filter
  matchesNiche(trend, nicheFilter) {
    if (!nicheFilter) return true;
    
    const niches = Array.isArray(nicheFilter) ? nicheFilter : [nicheFilter];
    return trend.niche.some(trendNiche => 
      niches.some(filterNiche => 
        trendNiche.toLowerCase().includes(filterNiche.toLowerCase())
      )
    );
  }

  // Extract hashtags from text
  extractHashtags(text) {
    if (!text) return [];
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  // Mock data generators for development/testing
  generateMockInstagramTrends(niche) {
    const mockTrends = [
      {
        id: 'ig_trend_1',
        title: 'Morning Routine Aesthetic',
        description: 'Start your day with intention and style',
        hashtags: ['morningroutine', 'aesthetic', 'selfcare', 'lifestyle'],
        metrics: { views: 250000, likes: 15000, comments: 800, growth: 1200 },
        niche: ['lifestyle', 'beauty'],
        thumbnailUrl: 'https://example.com/thumb1.jpg'
      },
      {
        id: 'ig_trend_2',
        title: 'Quick Workout Challenge',
        description: '5-minute HIIT workout you can do anywhere',
        hashtags: ['fitness', 'workout', 'hiit', 'challenge'],
        metrics: { views: 180000, likes: 12000, comments: 600, growth: 800 },
        niche: ['fitness', 'health'],
        thumbnailUrl: 'https://example.com/thumb2.jpg'
      }
    ];

    return niche ? mockTrends.filter(trend => trend.niche.includes(niche)) : mockTrends;
  }

  generateMockTikTokTrends(niche) {
    const mockTrends = [
      {
        id: 'tt_trend_1',
        title: 'Dance Challenge 2024',
        description: 'New viral dance everyone is doing',
        hashtags: ['dance', 'viral', 'challenge', 'fyp'],
        audioTrack: { id: 'audio_1', title: 'Trending Beat', artist: 'Unknown' },
        metrics: { views: 500000, likes: 35000, comments: 2000, growth: 2500 },
        niche: ['entertainment', 'dance'],
        thumbnailUrl: 'https://example.com/thumb3.jpg'
      },
      {
        id: 'tt_trend_2',
        title: 'Cooking Hack',
        description: 'Mind-blowing kitchen trick',
        hashtags: ['cooking', 'hack', 'food', 'kitchen'],
        metrics: { views: 320000, likes: 18000, comments: 900, growth: 1500 },
        niche: ['food', 'lifestyle'],
        thumbnailUrl: 'https://example.com/thumb4.jpg'
      }
    ];

    return niche ? mockTrends.filter(trend => trend.niche.includes(niche)) : mockTrends;
  }

  generateMockYouTubeTrends(niche) {
    const mockTrends = [
      {
        id: 'yt_trend_1',
        title: 'Ultimate Tech Review 2024',
        description: 'Reviewing the latest gadgets and tech innovations',
        hashtags: ['tech', 'review', 'gadgets', '2024'],
        metrics: { views: 800000, likes: 45000, comments: 3500, growth: 3000 },
        niche: ['tech', 'education'],
        thumbnailUrl: 'https://example.com/thumb5.jpg',
        duration: 720
      },
      {
        id: 'yt_trend_2',
        title: 'Travel Vlog: Hidden Gems',
        description: 'Discovering amazing places off the beaten path',
        hashtags: ['travel', 'vlog', 'adventure', 'explore'],
        metrics: { views: 450000, likes: 28000, comments: 1800, growth: 1800 },
        niche: ['travel', 'lifestyle'],
        thumbnailUrl: 'https://example.com/thumb6.jpg',
        duration: 900
      }
    ];

    return niche ? mockTrends.filter(trend => trend.niche.includes(niche)) : mockTrends;
  }

  // Store trends in database
  async storeTrends(trends) {
    try {
      const storedTrends = [];
      
      for (const trendData of trends) {
        // Check if trend already exists
        const existingTrend = await Trend.findOne({ trendId: trendData.trendId });
        
        if (existingTrend) {
          // Update existing trend
          Object.assign(existingTrend, trendData);
          await existingTrend.save();
          storedTrends.push(existingTrend);
        } else {
          // Create new trend
          const newTrend = new Trend(trendData);
          await newTrend.save();
          storedTrends.push(newTrend);
        }
      }

      logger.info(`Stored ${storedTrends.length} trends in database`);
      return storedTrends;
    } catch (error) {
      logger.error('Error storing trends:', error);
      throw new Error('Failed to store trends in database');
    }
  }

  // Fetch and store trends for all platforms
  async fetchAndStoreTrends(niche = null) {
    try {
      logger.info('Starting trend collection process', { niche });
      
      const allTrends = [];
      
      // Fetch from all platforms
      const [instagramTrends, tiktokTrends, youtubeTrends] = await Promise.allSettled([
        this.fetchInstagramTrends(niche),
        this.fetchTikTokTrends(niche),
        this.fetchYouTubeTrends(niche)
      ]);

      // Collect successful results
      if (instagramTrends.status === 'fulfilled') {
        allTrends.push(...instagramTrends.value);
      } else {
        logger.error('Instagram trends fetch failed:', instagramTrends.reason);
      }

      if (tiktokTrends.status === 'fulfilled') {
        allTrends.push(...tiktokTrends.value);
      } else {
        logger.error('TikTok trends fetch failed:', tiktokTrends.reason);
      }

      if (youtubeTrends.status === 'fulfilled') {
        allTrends.push(...youtubeTrends.value);
      } else {
        logger.error('YouTube trends fetch failed:', youtubeTrends.reason);
      }

      // Store all trends
      const storedTrends = await this.storeTrends(allTrends);
      
      logger.info(`Trend collection completed. Stored ${storedTrends.length} trends`);
      return storedTrends;
    } catch (error) {
      logger.error('Error in trend collection process:', error);
      throw error;
    }
  }
}

module.exports = new SocialMediaService();