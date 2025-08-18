// Set up test environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

const aiService = require('../../src/services/aiService');

// Mock OpenAI service for testing
jest.mock('../../src/config/openai', () => ({
  makeRequest: jest.fn(),
  getUsageStats: jest.fn()
}));

const openaiService = require('../../src/config/openai');

describe('AI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeStyle', () => {
    it('should analyze content style successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              tone: { primary: 'casual', confidence: 0.8 },
              voice: { personality: 'friendly', perspective: 'first-person' },
              themes: ['lifestyle', 'motivation'],
              niche: { primary: 'lifestyle', confidence: 0.9 }
            })
          }
        }],
        usage: { total_tokens: 150, prompt_tokens: 100, completion_tokens: 50 }
      };

      openaiService.makeRequest.mockResolvedValue(mockResponse);

      const result = await aiService.analyzeStyle('This is my casual lifestyle content!');

      expect(result.success).toBe(true);
      expect(result.data.tone.primary).toBe('casual');
      expect(result.data.niche.primary).toBe('lifestyle');
      expect(openaiService.makeRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('social media analyst')
            })
          ])
        })
      );
    });

    it('should handle analysis errors gracefully', async () => {
      openaiService.makeRequest.mockRejectedValue(new Error('API Error'));

      await expect(aiService.analyzeStyle('test content'))
        .rejects.toThrow('Style analysis failed: API Error');
    });
  });

  describe('generateContent', () => {
    it('should generate content successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'Amazing Content',
              hook: 'Did you know...',
              script: 'Full script here',
              hashtags: ['lifestyle', 'motivation'],
              sceneBreakdown: [
                { sceneNumber: 1, description: 'Opening scene' }
              ]
            })
          }
        }],
        usage: { total_tokens: 200, prompt_tokens: 150, completion_tokens: 50 }
      };

      openaiService.makeRequest.mockResolvedValue(mockResponse);

      const styleProfile = { tone: { primary: 'casual' } };
      const contentParams = { platform: 'Instagram', contentType: 'Reel' };

      const result = await aiService.generateContent(styleProfile, contentParams);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Amazing Content');
      expect(result.data.hashtags).toContain('lifestyle');
    });

    it('should handle generation errors gracefully', async () => {
      openaiService.makeRequest.mockRejectedValue(new Error('Generation failed'));

      const styleProfile = { tone: { primary: 'casual' } };
      const contentParams = { platform: 'Instagram' };

      await expect(aiService.generateContent(styleProfile, contentParams))
        .rejects.toThrow('Content generation failed: Generation failed');
    });
  });

  describe('batchGenerateContent', () => {
    it('should generate multiple content pieces', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              contentBatch: [
                { id: 1, title: 'Content 1', hook: 'Hook 1' },
                { id: 2, title: 'Content 2', hook: 'Hook 2' }
              ],
              batchSummary: {
                totalVariations: 2,
                diversityScore: 'high'
              }
            })
          }
        }],
        usage: { total_tokens: 500, prompt_tokens: 300, completion_tokens: 200 }
      };

      openaiService.makeRequest.mockResolvedValue(mockResponse);

      const styleProfile = { tone: { primary: 'casual' } };
      const contentParams = { platform: 'Instagram', theme: 'lifestyle' };

      const result = await aiService.batchGenerateContent(styleProfile, contentParams, 2);

      expect(result.success).toBe(true);
      expect(result.data.contentBatch).toHaveLength(2);
      expect(result.data.batchSummary.totalVariations).toBe(2);
    });
  });

  describe('reverseEngineerContent', () => {
    it('should analyze and reverse engineer content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              contentAnalysis: {
                hook: { type: 'question', effectiveness: 'high' },
                structure: { format: 'story', pacing: 'fast' }
              },
              adaptationStrategy: {
                coreElements: ['emotional hook'],
                styleTranslation: 'adapt to user style'
              }
            })
          }
        }],
        usage: { total_tokens: 300, prompt_tokens: 200, completion_tokens: 100 }
      };

      openaiService.makeRequest.mockResolvedValue(mockResponse);

      const result = await aiService.reverseEngineerContent(
        'Viral content example',
        'Instagram',
        { views: 1000000 }
      );

      expect(result.success).toBe(true);
      expect(result.data.contentAnalysis.hook.type).toBe('question');
      expect(result.data.adaptationStrategy.coreElements).toContain('emotional hook');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when OpenAI is working', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Hello!' } }],
        usage: { total_tokens: 10 }
      };

      openaiService.makeRequest.mockResolvedValue(mockResponse);

      const result = await aiService.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('should return unhealthy status when OpenAI fails', async () => {
      openaiService.makeRequest.mockRejectedValue(new Error('Service unavailable'));

      const result = await aiService.healthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Service unavailable');
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', () => {
      const mockStats = {
        totalTokens: 1000,
        totalCost: 0.05
      };

      openaiService.getUsageStats.mockReturnValue(mockStats);

      const stats = aiService.getUsageStats();

      expect(stats.totalTokens).toBe(1000);
      expect(stats.totalCost).toBe(0.05);
    });
  });
});