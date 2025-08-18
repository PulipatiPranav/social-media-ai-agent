// Set up test environment
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const StyleProfile = require('../../src/models/StyleProfile');
const Content = require('../../src/models/Content');
const jwt = require('jsonwebtoken');

// Mock the AI service to avoid actual API calls
jest.mock('../../src/services/aiService', () => ({
  analyzeStyle: jest.fn(),
  generateContent: jest.fn(),
  batchGenerateContent: jest.fn(),
  reverseEngineerContent: jest.fn(),
  getUsageStats: jest.fn(() => ({
    totalTokens: 0,
    totalCost: 0
  })),
  healthCheck: jest.fn(() => ({
    status: 'healthy',
    model: 'gpt-3.5-turbo'
  }))
}));

const aiService = require('../../src/services/aiService');

describe('AI Controller', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      email: 'test@example.com',
      password: 'password123',
      profile: {
        name: 'Test User',
        niche: 'fitness',
        platforms: ['instagram']
      }
    });
    await testUser.save();

    // Generate auth token
    authToken = testUser.generateAuthToken();
  });

  describe('POST /api/ai/analyze-style', () => {
    it('should analyze style and create profile successfully', async () => {
      const mockAnalysisResult = {
        success: true,
        data: {
          tone: {
            primary: 'casual',
            confidence: 0.8
          },
          voice: {
            personality: 'friendly',
            perspective: 'first-person',
            formality: 'casual'
          },
          themes: ['fitness', 'motivation'],
          niche: {
            primary: 'fitness',
            confidence: 0.9
          },
          targetAudience: {
            ageRange: '18-35',
            interests: ['fitness', 'health']
          },
          writingPatterns: {
            sentenceLength: 'medium',
            emojiUsage: 'moderate'
          },
          contentStructure: {
            hookStyle: 'question',
            bodyStructure: 'tips'
          }
        },
        usage: {
          total_tokens: 150,
          prompt_tokens: 100,
          completion_tokens: 50
        }
      };

      aiService.analyzeStyle.mockResolvedValue(mockAnalysisResult);

      const response = await request(app)
        .post('/api/ai/analyze-style')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a sample fitness post about staying motivated and working out regularly. Remember to push yourself!',
          profileName: 'Fitness Style'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.name).toBe('Fitness Style');
      expect(response.body.data.profile.tone.primary).toBe('casual');
      expect(response.body.data.usage.tokensUsed).toBe(150);

      // Verify profile was saved to database
      const savedProfile = await StyleProfile.findById(response.body.data.profile.id);
      expect(savedProfile).toBeTruthy();
      expect(savedProfile.userId.toString()).toBe(testUser._id.toString());
    });

    it('should return error for content too short', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-style')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Too short'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for missing content', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-style')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-style')
        .send({
          content: 'This is a sample fitness post about staying motivated and working out regularly.'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle AI service failure', async () => {
      aiService.analyzeStyle.mockResolvedValue({
        success: false,
        error: 'Analysis failed'
      });

      const response = await request(app)
        .post('/api/ai/analyze-style')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a sample fitness post about staying motivated and working out regularly. Remember to push yourself!'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ANALYSIS_FAILED');
    });
  });

  describe('GET /api/ai/style-profiles', () => {
    beforeEach(async () => {
      // Create test style profiles
      await StyleProfile.create([
        {
          userId: testUser._id,
          name: 'Fitness Style',
          isDefault: true,
          tone: { primary: 'casual', confidence: 0.8 },
          voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
          themes: ['fitness'],
          niche: { primary: 'fitness', confidence: 0.9 }
        },
        {
          userId: testUser._id,
          name: 'Professional Style',
          isDefault: false,
          tone: { primary: 'professional', confidence: 0.9 },
          voice: { personality: 'authoritative', perspective: 'third-person', formality: 'formal' },
          themes: ['business'],
          niche: { primary: 'business', confidence: 0.8 }
        }
      ]);
    });

    it('should return user style profiles', async () => {
      const response = await request(app)
        .get('/api/ai/style-profiles')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profiles).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      
      // Should be sorted with default first
      expect(response.body.data.profiles[0].isDefault).toBe(true);
      expect(response.body.data.profiles[0].name).toBe('Fitness Style');
    });

    it('should return empty array for user with no profiles', async () => {
      // Create new user with no profiles
      const newUser = new User({
        email: 'newuser@example.com',
        password: 'password123',
        profile: {
          name: 'New User',
          niche: 'general',
          platforms: ['instagram']
        }
      });
      await newUser.save();
      const newUserToken = newUser.generateAuthToken();

      const response = await request(app)
        .get('/api/ai/style-profiles')
        .set('Authorization', `Bearer ${newUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profiles).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('GET /api/ai/style-profiles/:id', () => {
    let testProfile;

    beforeEach(async () => {
      testProfile = await StyleProfile.create({
        userId: testUser._id,
        name: 'Test Profile',
        isDefault: true,
        tone: { primary: 'casual', confidence: 0.8 },
        voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
        themes: ['fitness'],
        niche: { primary: 'fitness', confidence: 0.9 },
        analysisMetadata: {
          sourceContent: 'Sample content',
          tokensUsed: 100,
          confidence: 0.8
        }
      });
    });

    it('should return specific style profile', async () => {
      const response = await request(app)
        .get(`/api/ai/style-profiles/${testProfile._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.id).toBe(testProfile._id.toString());
      expect(response.body.data.profile.name).toBe('Test Profile');
      expect(response.body.data.profile.analysisMetadata).toBeDefined();
    });

    it('should return 404 for non-existent profile', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/ai/style-profiles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROFILE_NOT_FOUND');
    });

    it('should return 400 for invalid profile ID', async () => {
      const response = await request(app)
        .get('/api/ai/style-profiles/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/ai/style-profiles/:id', () => {
    let testProfile;

    beforeEach(async () => {
      testProfile = await StyleProfile.create({
        userId: testUser._id,
        name: 'Test Profile',
        isDefault: false,
        tone: { primary: 'casual', confidence: 0.8 },
        voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
        themes: ['fitness'],
        niche: { primary: 'fitness', confidence: 0.9 }
      });
    });

    it('should update style profile successfully', async () => {
      const updates = {
        name: 'Updated Profile',
        tone: {
          primary: 'professional',
          confidence: 0.9
        },
        themes: ['business', 'leadership']
      };

      const response = await request(app)
        .put(`/api/ai/style-profiles/${testProfile._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.name).toBe('Updated Profile');
      expect(response.body.data.profile.tone.primary).toBe('professional');
      expect(response.body.data.profile.themes).toEqual(['business', 'leadership']);
    });

    it('should return 404 for non-existent profile', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .put(`/api/ai/style-profiles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/ai/style-profiles/:id', () => {
    let testProfile1, testProfile2;

    beforeEach(async () => {
      testProfile1 = await StyleProfile.create({
        userId: testUser._id,
        name: 'Profile 1',
        isDefault: true,
        tone: { primary: 'casual', confidence: 0.8 },
        voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
        themes: ['fitness'],
        niche: { primary: 'fitness', confidence: 0.9 }
      });

      testProfile2 = await StyleProfile.create({
        userId: testUser._id,
        name: 'Profile 2',
        isDefault: false,
        tone: { primary: 'professional', confidence: 0.9 },
        voice: { personality: 'authoritative', perspective: 'third-person', formality: 'formal' },
        themes: ['business'],
        niche: { primary: 'business', confidence: 0.8 }
      });
    });

    it('should delete non-default profile successfully', async () => {
      const response = await request(app)
        .delete(`/api/ai/style-profiles/${testProfile2._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify profile was deleted
      const deletedProfile = await StyleProfile.findById(testProfile2._id);
      expect(deletedProfile).toBeNull();
    });

    it('should prevent deletion of only profile', async () => {
      // Delete the second profile first
      await StyleProfile.deleteOne({ _id: testProfile2._id });

      const response = await request(app)
        .delete(`/api/ai/style-profiles/${testProfile1._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CANNOT_DELETE_ONLY_PROFILE');
    });
  });

  describe('POST /api/ai/style-profiles/:id/set-default', () => {
    let testProfile1, testProfile2;

    beforeEach(async () => {
      testProfile1 = await StyleProfile.create({
        userId: testUser._id,
        name: 'Profile 1',
        isDefault: true,
        tone: { primary: 'casual', confidence: 0.8 },
        voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
        themes: ['fitness'],
        niche: { primary: 'fitness', confidence: 0.9 }
      });

      testProfile2 = await StyleProfile.create({
        userId: testUser._id,
        name: 'Profile 2',
        isDefault: false,
        tone: { primary: 'professional', confidence: 0.9 },
        voice: { personality: 'authoritative', perspective: 'third-person', formality: 'formal' },
        themes: ['business'],
        niche: { primary: 'business', confidence: 0.8 }
      });
    });

    it('should set profile as default successfully', async () => {
      const response = await request(app)
        .post(`/api/ai/style-profiles/${testProfile2._id}/set-default`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.isDefault).toBe(true);

      // Verify the change in database
      const updatedProfile2 = await StyleProfile.findById(testProfile2._id);
      const updatedProfile1 = await StyleProfile.findById(testProfile1._id);
      
      expect(updatedProfile2.isDefault).toBe(true);
      expect(updatedProfile1.isDefault).toBe(false);
    });
  });

  describe('GET /api/ai/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/ai/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ai).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /api/ai/usage', () => {
    it('should return usage statistics', async () => {
      const response = await request(app)
        .get('/api/ai/usage')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.limits).toBeDefined();
    });
  });

  describe('POST /api/ai/generate-content', () => {
    let testProfile;

    beforeEach(async () => {
      testProfile = await StyleProfile.create({
        userId: testUser._id,
        name: 'Test Profile',
        isDefault: true,
        tone: { primary: 'casual', confidence: 0.8 },
        voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
        themes: ['fitness'],
        niche: { primary: 'fitness', confidence: 0.9 }
      });
    });

    it('should generate content successfully', async () => {
      const mockGenerationResult = {
        success: true,
        data: {
          title: 'Amazing Fitness Transformation',
          hook: 'Want to see what 30 days of consistency looks like?',
          script: 'This is the full script for the fitness content...',
          sceneBreakdown: [
            {
              sceneNumber: 1,
              description: 'Opening hook with before photo',
              duration: '3 seconds',
              cameraAngle: 'Close-up',
              props: ['Before photo'],
              transitions: 'Quick cut to after photo'
            }
          ],
          hashtags: ['fitness', 'transformation', 'motivation'],
          audioSuggestions: [
            {
              type: 'trending',
              description: 'Upbeat motivational music',
              timing: 'Throughout the video'
            }
          ],
          culturalReferences: ['New Year New Me trend'],
          callToAction: 'Follow for more fitness tips!',
          estimatedEngagement: {
            viralPotential: 'high',
            targetAudience: 'Fitness enthusiasts aged 18-35',
            bestPostingTime: '6-8 PM'
          }
        },
        usage: {
          total_tokens: 300,
          prompt_tokens: 200,
          completion_tokens: 100
        }
      };

      aiService.generateContent.mockResolvedValue(mockGenerationResult);

      const response = await request(app)
        .post('/api/ai/generate-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          styleProfileId: testProfile._id,
          platform: 'Instagram',
          contentType: 'Reel',
          targetLength: '30-60 seconds',
          trends: [
            {
              id: 'trend1',
              title: 'Fitness Transformation',
              hashtags: ['transformation']
            }
          ],
          additionalContext: 'Focus on motivation'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBeDefined();
      expect(response.body.data.content.title).toBe('Amazing Fitness Transformation');
      expect(response.body.data.content.hook).toBe('Want to see what 30 days of consistency looks like?');
      expect(response.body.data.content.sceneBreakdown).toHaveLength(1);
      expect(response.body.data.content.hashtags).toEqual(['fitness', 'transformation', 'motivation']);
      expect(response.body.data.usage.tokensUsed).toBe(300);

      // Verify content was saved to database
      const savedContent = await Content.findById(response.body.data.content.id);
      expect(savedContent).toBeTruthy();
      expect(savedContent.userId.toString()).toBe(testUser._id.toString());
      expect(savedContent.styleProfileId.toString()).toBe(testProfile._id.toString());
    });

    it('should use default style profile when none specified', async () => {
      const mockGenerationResult = {
        success: true,
        data: {
          title: 'Test Content',
          hook: 'Test hook',
          script: 'Test script',
          sceneBreakdown: [],
          hashtags: ['test'],
          audioSuggestions: [],
          culturalReferences: [],
          callToAction: 'Test CTA',
          estimatedEngagement: {
            viralPotential: 'medium'
          }
        },
        usage: {
          total_tokens: 200,
          prompt_tokens: 150,
          completion_tokens: 50
        }
      };

      aiService.generateContent.mockResolvedValue(mockGenerationResult);

      const response = await request(app)
        .post('/api/ai/generate-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'Instagram',
          contentType: 'Reel'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBeDefined();
    });

    it('should return error for non-existent style profile', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post('/api/ai/generate-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          styleProfileId: fakeId,
          platform: 'Instagram'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('STYLE_PROFILE_NOT_FOUND');
    });

    it('should handle AI service failure', async () => {
      aiService.generateContent.mockResolvedValue({
        success: false,
        error: 'Generation failed'
      });

      const response = await request(app)
        .post('/api/ai/generate-content')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'Instagram',
          contentType: 'Reel'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GENERATION_FAILED');
    });
  });

  describe('POST /api/ai/batch-generate', () => {
    let testProfile;

    beforeEach(async () => {
      testProfile = await StyleProfile.create({
        userId: testUser._id,
        name: 'Test Profile',
        isDefault: true,
        tone: { primary: 'casual', confidence: 0.8 },
        voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
        themes: ['fitness'],
        niche: { primary: 'fitness', confidence: 0.9 }
      });
    });

    it('should generate batch content successfully', async () => {
      const mockBatchResult = {
        success: true,
        data: {
          contentBatch: [
            {
              id: 1,
              title: 'Fitness Tip #1',
              hook: 'Here\'s a quick fitness tip',
              script: 'Script for tip 1...',
              angle: 'Educational approach',
              hashtags: ['fitness', 'tips'],
              estimatedViralPotential: 'medium',
              uniqueElements: ['Quick tip format']
            },
            {
              id: 2,
              title: 'Fitness Tip #2',
              hook: 'Another great fitness tip',
              script: 'Script for tip 2...',
              angle: 'Motivational approach',
              hashtags: ['fitness', 'motivation'],
              estimatedViralPotential: 'high',
              uniqueElements: ['Motivational story']
            }
          ],
          batchSummary: {
            totalVariations: 2,
            diversityScore: 'high',
            recommendedPostingSchedule: 'Post 1 per day'
          }
        },
        usage: {
          total_tokens: 600,
          prompt_tokens: 400,
          completion_tokens: 200
        }
      };

      aiService.batchGenerateContent.mockResolvedValue(mockBatchResult);

      const response = await request(app)
        .post('/api/ai/batch-generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          styleProfileId: testProfile._id,
          platform: 'Instagram',
          theme: 'Fitness Tips',
          count: 2,
          variety: 'high'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contentBatch).toHaveLength(2);
      expect(response.body.data.batchSummary.totalGenerated).toBe(2);
      expect(response.body.data.usage.tokensUsed).toBe(600);

      // Verify content was saved to database
      const savedContent = await Content.find({ userId: testUser._id });
      expect(savedContent).toHaveLength(2);
    });

    it('should return error for invalid count', async () => {
      const response = await request(app)
        .post('/api/ai/batch-generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'Instagram',
          count: 25 // Too high
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle AI service failure', async () => {
      aiService.batchGenerateContent.mockResolvedValue({
        success: false,
        error: 'Batch generation failed'
      });

      const response = await request(app)
        .post('/api/ai/batch-generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'Instagram',
          count: 5
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BATCH_GENERATION_FAILED');
    });
  });

  describe('POST /api/ai/reverse-engineer', () => {
    let testProfile;

    beforeEach(async () => {
      testProfile = await StyleProfile.create({
        userId: testUser._id,
        name: 'Test Profile',
        isDefault: true,
        tone: { primary: 'casual', confidence: 0.8 },
        voice: { personality: 'friendly', perspective: 'first-person', formality: 'casual' },
        themes: ['fitness'],
        niche: { primary: 'fitness', confidence: 0.9 }
      });
    });

    it('should reverse engineer content successfully', async () => {
      const mockAnalysisResult = {
        success: true,
        data: {
          contentAnalysis: {
            hook: {
              type: 'question',
              effectiveness: 'Creates curiosity',
              timing: 'First 3 seconds'
            },
            structure: {
              format: 'story',
              pacing: 'fast',
              transitions: ['Quick cuts', 'Smooth transitions']
            },
            viralElements: [
              {
                element: 'Transformation reveal',
                impact: 'High emotional impact'
              }
            ],
            audioStrategy: {
              type: 'trending',
              timing: 'Throughout video',
              'emotional impact': 'Motivational'
            },
            visualElements: ['Before/after photos', 'Progress shots']
          },
          adaptationStrategy: {
            coreElements: ['Transformation reveal', 'Progress tracking'],
            adaptableElements: ['Music choice', 'Caption style'],
            styleTranslation: 'Adapt to user\'s casual tone',
            alternativeApproaches: [
              {
                approach: 'Educational angle',
                reasoning: 'Fits user\'s helpful personality'
              }
            ]
          },
          generatedAlternatives: [
            {
              version: 1,
              hook: 'Want to see my 30-day transformation?',
              keyChanges: ['Adapted to first-person', 'More casual tone'],
              expectedImpact: 'High engagement'
            }
          ]
        },
        usage: {
          total_tokens: 400,
          prompt_tokens: 300,
          completion_tokens: 100
        }
      };

      aiService.reverseEngineerContent.mockResolvedValue(mockAnalysisResult);

      const response = await request(app)
        .post('/api/ai/reverse-engineer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Check out this amazing transformation! From couch potato to fitness enthusiast in just 30 days.',
          platform: 'Instagram',
          metrics: {
            views: 100000,
            likes: 5000,
            shares: 500
          },
          adaptToStyle: true,
          generateAlternatives: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.analysis.contentAnalysis).toBeDefined();
      expect(response.body.data.adaptedContent).toHaveLength(1);
      expect(response.body.data.usage.tokensUsed).toBe(400);

      // Verify adapted content was saved to database
      const savedContent = await Content.find({ userId: testUser._id, type: 'analyzed' });
      expect(savedContent).toHaveLength(1);
      expect(savedContent[0].hook).toBe('Want to see my 30-day transformation?');
    });

    it('should return error for missing content', async () => {
      const response = await request(app)
        .post('/api/ai/reverse-engineer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'Instagram'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return error for content too short', async () => {
      const response = await request(app)
        .post('/api/ai/reverse-engineer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Too short',
          platform: 'Instagram'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle AI service failure', async () => {
      aiService.reverseEngineerContent.mockResolvedValue({
        success: false,
        error: 'Reverse engineering failed'
      });

      const response = await request(app)
        .post('/api/ai/reverse-engineer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a sample content to reverse engineer for testing purposes.',
          platform: 'Instagram'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('REVERSE_ENGINEERING_FAILED');
    });
  });
});