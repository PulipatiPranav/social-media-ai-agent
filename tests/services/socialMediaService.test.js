const socialMediaService = require('../../src/services/socialMediaService');
const Trend = require('../../src/models/Trend');

// Mock the Trend model
jest.mock('../../src/models/Trend');

describe('SocialMediaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchInstagramTrends', () => {
    it('should fetch Instagram trends successfully', async () => {
      const trends = await socialMediaService.fetchInstagramTrends();
      
      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
      
      // Check trend structure
      const trend = trends[0];
      expect(trend).toHaveProperty('platform', 'instagram');
      expect(trend).toHaveProperty('trendId');
      expect(trend).toHaveProperty('title');
      expect(trend).toHaveProperty('hashtags');
      expect(trend).toHaveProperty('metrics');
      expect(trend).toHaveProperty('niche');
    });

    it('should filter trends by niche', async () => {
      const trends = await socialMediaService.fetchInstagramTrends('fitness');
      
      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      
      // All trends should match the fitness niche
      trends.forEach(trend => {
        expect(trend.niche).toContain('fitness');
      });
    });
  });

  describe('fetchTikTokTrends', () => {
    it('should fetch TikTok trends successfully', async () => {
      const trends = await socialMediaService.fetchTikTokTrends();
      
      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
      
      const trend = trends[0];
      expect(trend).toHaveProperty('platform', 'tiktok');
      expect(trend).toHaveProperty('trendId');
      expect(trend).toHaveProperty('audioTrack');
    });
  });

  describe('fetchYouTubeTrends', () => {
    it('should fetch YouTube trends successfully', async () => {
      const trends = await socialMediaService.fetchYouTubeTrends();
      
      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
      
      const trend = trends[0];
      expect(trend).toHaveProperty('platform', 'youtube');
      expect(trend).toHaveProperty('trendId');
      expect(trend).toHaveProperty('metadata.duration');
    });
  });

  describe('normalizeTrendData', () => {
    it('should normalize trend data correctly', async () => {
      const rawData = {
        id: 'test_123',
        title: 'Test Trend',
        description: 'Test description #fitness #health',
        metrics: {
          views: 100000,
          likes: 5000,
          comments: 200
        }
      };

      const normalized = await socialMediaService.normalizeTrendData('instagram', rawData);
      
      expect(normalized).toHaveProperty('platform', 'instagram');
      expect(normalized).toHaveProperty('trendId');
      expect(normalized.trendId).toContain('instagram_test_123');
      expect(normalized).toHaveProperty('title', 'Test Trend');
      expect(normalized).toHaveProperty('metrics.engagementRate');
      expect(normalized).toHaveProperty('niche');
      expect(normalized).toHaveProperty('relevanceScore');
    });
  });

  describe('calculateEngagementRate', () => {
    it('should calculate engagement rate correctly', () => {
      const metrics = {
        views: 100000,
        likes: 5000,
        comments: 500,
        shares: 200
      };

      const rate = socialMediaService.calculateEngagementRate(metrics);
      expect(rate).toBe(5.7); // (5000 + 500 + 200) / 100000 * 100
    });

    it('should return 0 for zero views', () => {
      const metrics = { views: 0, likes: 100 };
      const rate = socialMediaService.calculateEngagementRate(metrics);
      expect(rate).toBe(0);
    });
  });

  describe('detectNiche', () => {
    it('should detect fitness niche', () => {
      const data = {
        title: 'Amazing Workout Routine',
        description: 'Get fit with this gym workout'
      };

      const niches = socialMediaService.detectNiche(data);
      expect(niches).toContain('fitness');
    });

    it('should detect multiple niches', () => {
      const data = {
        title: 'Healthy Cooking Recipe',
        description: 'Learn to cook healthy meals in your kitchen'
      };

      const niches = socialMediaService.detectNiche(data);
      expect(niches.length).toBeGreaterThan(1);
      expect(niches).toContain('food');
    });

    it('should return general for unknown content', () => {
      const data = {
        title: 'Random Content',
        description: 'Some random stuff'
      };

      const niches = socialMediaService.detectNiche(data);
      expect(niches).toContain('general');
    });
  });

  describe('storeTrends', () => {
    it('should store new trends in database', async () => {
      const mockTrends = [
        {
          platform: 'instagram',
          trendId: 'test_trend_1',
          title: 'Test Trend 1',
          hashtags: ['test'],
          metrics: { views: 1000 },
          niche: ['general']
        }
      ];

      // Mock Trend.findOne to return null (trend doesn't exist)
      Trend.findOne.mockResolvedValue(null);
      
      // Mock Trend constructor and save
      const mockSave = jest.fn().mockResolvedValue(mockTrends[0]);
      Trend.mockImplementation(() => ({
        save: mockSave
      }));

      const result = await socialMediaService.storeTrends(mockTrends);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should update existing trends', async () => {
      const mockTrends = [
        {
          platform: 'instagram',
          trendId: 'existing_trend',
          title: 'Updated Trend',
          hashtags: ['updated'],
          metrics: { views: 2000 },
          niche: ['general']
        }
      ];

      // Mock existing trend
      const existingTrend = {
        trendId: 'existing_trend',
        title: 'Old Title',
        save: jest.fn().mockResolvedValue(mockTrends[0])
      };

      Trend.findOne.mockResolvedValue(existingTrend);

      const result = await socialMediaService.storeTrends(mockTrends);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(existingTrend.save).toHaveBeenCalled();
      expect(existingTrend.title).toBe('Updated Trend');
    });
  });

  describe('fetchAndStoreTrends', () => {
    it('should fetch and store trends from all platforms', async () => {
      // Mock the store method
      const mockStoredTrends = [{ id: 1 }, { id: 2 }, { id: 3 }];
      jest.spyOn(socialMediaService, 'storeTrends').mockResolvedValue(mockStoredTrends);

      const result = await socialMediaService.fetchAndStoreTrends();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(socialMediaService.storeTrends).toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      // Mock one platform to fail
      jest.spyOn(socialMediaService, 'fetchInstagramTrends').mockRejectedValue(new Error('API Error'));
      jest.spyOn(socialMediaService, 'storeTrends').mockResolvedValue([]);

      // Should not throw error, but handle gracefully
      const result = await socialMediaService.fetchAndStoreTrends();
      expect(result).toBeDefined();
    });
  });
});