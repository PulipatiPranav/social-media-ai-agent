const aiService = require('../services/aiService');
const StyleProfile = require('../models/StyleProfile');
const Content = require('../models/Content');
const logger = require('../config/logger');
const TokenEstimator = require('../utils/tokenEstimator');

class AIController {
  // POST /api/ai/analyze-style
  async analyzeStyle(req, res) {
    try {
      const { content, profileName, setAsDefault = false } = req.body;
      const userId = req.user.id;

      // Validate input
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTENT',
            message: 'Content is required for style analysis'
          }
        });
      }

      if (content.length > 10000) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'CONTENT_TOO_LONG',
            message: 'Content must be less than 10,000 characters'
          }
        });
      }

      // Estimate tokens for cost tracking
      const estimatedTokens = TokenEstimator.estimateTokens(content);
      logger.info('Starting style analysis', {
        userId,
        contentLength: content.length,
        estimatedTokens
      });

      // Perform AI analysis
      const analysisResult = await aiService.analyzeStyle(content);

      if (!analysisResult.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'ANALYSIS_FAILED',
            message: 'Failed to analyze content style'
          }
        });
      }

      // Create style profile name if not provided
      const finalProfileName = profileName || `Style Analysis ${new Date().toLocaleDateString()}`;

      // Check if profile name already exists for this user
      const existingProfile = await StyleProfile.findOne({
        userId,
        name: finalProfileName
      });

      if (existingProfile) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PROFILE_NAME_EXISTS',
            message: 'A style profile with this name already exists'
          }
        });
      }

      // Create new style profile from analysis
      const styleProfile = new StyleProfile({
        userId,
        name: finalProfileName,
        isDefault: setAsDefault,
        tone: analysisResult.data.tone || {
          primary: 'casual',
          confidence: 0.5
        },
        voice: analysisResult.data.voice || {
          personality: 'friendly',
          perspective: 'first-person',
          formality: 'casual'
        },
        themes: analysisResult.data.themes || [],
        niche: analysisResult.data.niche || {
          primary: 'general',
          confidence: 0.5
        },
        targetAudience: analysisResult.data.targetAudience || {},
        writingPatterns: analysisResult.data.writingPatterns || {},
        contentStructure: analysisResult.data.contentStructure || {},
        analysisMetadata: {
          sourceContent: content.substring(0, 5000), // Store first 5000 chars
          analysisDate: new Date(),
          tokensUsed: analysisResult.usage?.total_tokens || 0,
          confidence: analysisResult.data.confidence || 0.7
        }
      });

      await styleProfile.save();

      // Track usage for cost monitoring
      res.locals.aiUsage = {
        tokensUsed: analysisResult.usage?.total_tokens || 0,
        cost: TokenEstimator.estimateCost(
          analysisResult.usage?.prompt_tokens || 0,
          analysisResult.usage?.completion_tokens || 0
        ).totalCost
      };

      logger.info('Style analysis completed', {
        userId,
        profileId: styleProfile._id,
        tokensUsed: analysisResult.usage?.total_tokens
      });

      res.status(201).json({
        success: true,
        data: {
          profile: {
            id: styleProfile._id,
            name: styleProfile.name,
            isDefault: styleProfile.isDefault,
            summary: styleProfile.summary,
            tone: styleProfile.tone,
            voice: styleProfile.voice,
            themes: styleProfile.themes,
            niche: styleProfile.niche,
            targetAudience: styleProfile.targetAudience,
            analysisMetadata: {
              analysisDate: styleProfile.analysisMetadata.analysisDate,
              tokensUsed: styleProfile.analysisMetadata.tokensUsed,
              confidence: styleProfile.analysisMetadata.confidence
            }
          },
          usage: {
            tokensUsed: analysisResult.usage?.total_tokens || 0,
            estimatedCost: res.locals.aiUsage.cost
          }
        }
      });

    } catch (error) {
      logger.error('Style analysis error', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during style analysis'
        }
      });
    }
  }

  // GET /api/ai/style-profiles
  async getStyleProfiles(req, res) {
    try {
      const userId = req.user.id;
      const { includeAnalysisData = false } = req.query;

      const profiles = await StyleProfile.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .select(includeAnalysisData === 'true' ? '' : '-analysisMetadata.sourceContent');

      res.json({
        success: true,
        data: {
          profiles: profiles.map(profile => ({
            id: profile._id,
            name: profile.name,
            isDefault: profile.isDefault,
            summary: profile.summary,
            tone: profile.tone,
            voice: profile.voice,
            themes: profile.themes,
            niche: profile.niche,
            targetAudience: profile.targetAudience,
            writingPatterns: profile.writingPatterns,
            contentStructure: profile.contentStructure,
            createdAt: profile.createdAt,
            ...(includeAnalysisData === 'true' && {
              analysisMetadata: profile.analysisMetadata
            })
          })),
          total: profiles.length
        }
      });

    } catch (error) {
      logger.error('Get style profiles error', {
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve style profiles'
        }
      });
    }
  }

  // GET /api/ai/style-profiles/:id
  async getStyleProfile(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const profile = await StyleProfile.findOne({ _id: id, userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Style profile not found'
          }
        });
      }

      res.json({
        success: true,
        data: {
          profile: {
            id: profile._id,
            name: profile.name,
            isDefault: profile.isDefault,
            tone: profile.tone,
            voice: profile.voice,
            themes: profile.themes,
            niche: profile.niche,
            targetAudience: profile.targetAudience,
            writingPatterns: profile.writingPatterns,
            contentStructure: profile.contentStructure,
            analysisMetadata: profile.analysisMetadata,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt
          }
        }
      });

    } catch (error) {
      logger.error('Get style profile error', {
        userId: req.user?.id,
        profileId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve style profile'
        }
      });
    }
  }

  // PUT /api/ai/style-profiles/:id
  async updateStyleProfile(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.userId;
      delete updates.analysisMetadata;
      delete updates._id;

      const profile = await StyleProfile.findOneAndUpdate(
        { _id: id, userId },
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Style profile not found'
          }
        });
      }

      logger.info('Style profile updated', {
        userId,
        profileId: id,
        updatedFields: Object.keys(updates)
      });

      res.json({
        success: true,
        data: {
          profile: {
            id: profile._id,
            name: profile.name,
            isDefault: profile.isDefault,
            summary: profile.summary,
            tone: profile.tone,
            voice: profile.voice,
            themes: profile.themes,
            niche: profile.niche,
            targetAudience: profile.targetAudience,
            writingPatterns: profile.writingPatterns,
            contentStructure: profile.contentStructure,
            updatedAt: profile.updatedAt
          }
        }
      });

    } catch (error) {
      logger.error('Update style profile error', {
        userId: req.user?.id,
        profileId: req.params.id,
        error: error.message
      });

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid profile data',
            details: Object.values(error.errors).map(err => err.message)
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update style profile'
        }
      });
    }
  }

  // DELETE /api/ai/style-profiles/:id
  async deleteStyleProfile(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const profile = await StyleProfile.findOne({ _id: id, userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Style profile not found'
          }
        });
      }

      // Prevent deletion of default profile if it's the only one
      if (profile.isDefault) {
        const profileCount = await StyleProfile.countDocuments({ userId });
        if (profileCount === 1) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'CANNOT_DELETE_ONLY_PROFILE',
              message: 'Cannot delete the only style profile. Create another profile first.'
            }
          });
        }
      }

      await StyleProfile.deleteOne({ _id: id, userId });

      // If we deleted the default profile, set another one as default
      if (profile.isDefault) {
        const nextProfile = await StyleProfile.findOne({ userId }).sort({ createdAt: 1 });
        if (nextProfile) {
          nextProfile.isDefault = true;
          await nextProfile.save();
        }
      }

      logger.info('Style profile deleted', {
        userId,
        profileId: id,
        profileName: profile.name
      });

      res.json({
        success: true,
        data: {
          message: 'Style profile deleted successfully'
        }
      });

    } catch (error) {
      logger.error('Delete style profile error', {
        userId: req.user?.id,
        profileId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete style profile'
        }
      });
    }
  }

  // POST /api/ai/style-profiles/:id/set-default
  async setDefaultProfile(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const profile = await StyleProfile.findOne({ _id: id, userId });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Style profile not found'
          }
        });
      }

      // Set this profile as default (pre-save hook will handle unsetting others)
      profile.isDefault = true;
      await profile.save();

      logger.info('Default style profile updated', {
        userId,
        profileId: id,
        profileName: profile.name
      });

      res.json({
        success: true,
        data: {
          profile: {
            id: profile._id,
            name: profile.name,
            isDefault: profile.isDefault,
            summary: profile.summary
          }
        }
      });

    } catch (error) {
      logger.error('Set default profile error', {
        userId: req.user?.id,
        profileId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to set default profile'
        }
      });
    }
  }

  // POST /api/ai/generate-content
  async generateContent(req, res) {
    try {
      const userId = req.user.id;
      const {
        styleProfileId,
        platform = 'Instagram',
        contentType = 'Reel',
        targetLength = '30-60 seconds',
        trends = [],
        additionalContext = '',
        customPrompt = ''
      } = req.body;

      // Get style profile (use default if not specified)
      let styleProfile;
      if (styleProfileId) {
        styleProfile = await StyleProfile.findOne({ _id: styleProfileId, userId });
        if (!styleProfile) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'STYLE_PROFILE_NOT_FOUND',
              message: 'Style profile not found'
            }
          });
        }
      } else {
        styleProfile = await StyleProfile.findOrCreateDefault(userId);
      }

      // Prepare content parameters
      const contentParams = {
        platform,
        contentType,
        targetLength,
        trends,
        additionalContext: customPrompt || additionalContext
      };

      // Estimate tokens for cost tracking
      const styleProfileData = styleProfile.toAIPrompt();
      const estimatedTokens = TokenEstimator.estimateTokens(
        JSON.stringify(styleProfileData) + JSON.stringify(contentParams)
      );

      logger.info('Starting content generation', {
        userId,
        styleProfileId: styleProfile._id,
        platform,
        contentType,
        estimatedTokens
      });

      // Generate content using AI service
      const generationResult = await aiService.generateContent(styleProfileData, contentParams);

      if (!generationResult.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: 'Failed to generate content'
          }
        });
      }

      // Create content record in database
      const content = new Content({
        userId,
        styleProfileId: styleProfile._id,
        platform,
        contentType,
        title: generationResult.data.title,
        hook: generationResult.data.hook,
        script: generationResult.data.script,
        sceneBreakdown: generationResult.data.sceneBreakdown || [],
        hashtags: generationResult.data.hashtags || [],
        audioSuggestions: generationResult.data.audioSuggestions || [],
        culturalReferences: generationResult.data.culturalReferences || [],
        callToAction: generationResult.data.callToAction,
        estimatedEngagement: generationResult.data.estimatedEngagement || {},
        trends: trends,
        generationMetadata: {
          prompt: customPrompt || additionalContext,
          tokensUsed: generationResult.usage?.total_tokens || 0,
          cost: TokenEstimator.estimateCost(
            generationResult.usage?.prompt_tokens || 0,
            generationResult.usage?.completion_tokens || 0
          ).totalCost,
          model: 'gpt-4',
          temperature: 0.7
        }
      });

      await content.save();

      // Track usage for cost monitoring
      res.locals.aiUsage = {
        tokensUsed: generationResult.usage?.total_tokens || 0,
        cost: content.generationMetadata.cost
      };

      logger.info('Content generation completed', {
        userId,
        contentId: content._id,
        platform,
        tokensUsed: generationResult.usage?.total_tokens
      });

      res.status(201).json({
        success: true,
        data: {
          content: {
            id: content._id,
            title: content.title,
            hook: content.hook,
            script: content.script,
            sceneBreakdown: content.sceneBreakdown,
            hashtags: content.hashtags,
            audioSuggestions: content.audioSuggestions,
            culturalReferences: content.culturalReferences,
            callToAction: content.callToAction,
            estimatedEngagement: content.estimatedEngagement,
            platform: content.platform,
            contentType: content.contentType,
            createdAt: content.createdAt
          },
          usage: {
            tokensUsed: generationResult.usage?.total_tokens || 0,
            estimatedCost: content.generationMetadata.cost
          }
        }
      });

    } catch (error) {
      logger.error('Content generation error', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during content generation'
        }
      });
    }
  }

  // POST /api/ai/batch-generate
  async batchGenerateContent(req, res) {
    try {
      const userId = req.user.id;
      const {
        styleProfileId,
        platform = 'Instagram',
        theme = 'General',
        count = 10,
        trends = [],
        variety = 'medium'
      } = req.body;

      // Validate count
      if (count < 2 || count > 20) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_COUNT',
            message: 'Count must be between 2 and 20'
          }
        });
      }

      // Get style profile (use default if not specified)
      let styleProfile;
      if (styleProfileId) {
        styleProfile = await StyleProfile.findOne({ _id: styleProfileId, userId });
        if (!styleProfile) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'STYLE_PROFILE_NOT_FOUND',
              message: 'Style profile not found'
            }
          });
        }
      } else {
        styleProfile = await StyleProfile.findOrCreateDefault(userId);
      }

      // Prepare content parameters
      const contentParams = {
        platform,
        theme,
        trends,
        variety
      };

      // Estimate tokens for cost tracking
      const styleProfileData = styleProfile.toAIPrompt();
      const estimatedTokens = TokenEstimator.estimateTokens(
        JSON.stringify(styleProfileData) + JSON.stringify(contentParams) + `count: ${count}`
      );

      logger.info('Starting batch content generation', {
        userId,
        styleProfileId: styleProfile._id,
        platform,
        theme,
        count,
        estimatedTokens
      });

      // Generate batch content using AI service
      const batchResult = await aiService.batchGenerateContent(styleProfileData, contentParams, count);

      if (!batchResult.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'BATCH_GENERATION_FAILED',
            message: 'Failed to generate batch content'
          }
        });
      }

      // Create content records in database
      const contentBatch = batchResult.data.contentBatch || [];
      const createdContent = [];

      for (const contentItem of contentBatch) {
        const content = new Content({
          userId,
          styleProfileId: styleProfile._id,
          platform,
          contentType: 'Reel', // Default for batch generation
          title: contentItem.title,
          hook: contentItem.hook,
          script: contentItem.script,
          hashtags: contentItem.hashtags || [],
          estimatedEngagement: {
            viralPotential: contentItem.estimatedViralPotential || 'medium',
            targetAudience: `${theme} audience`,
            bestPostingTime: 'Peak hours'
          },
          trends: trends,
          generationMetadata: {
            prompt: `Batch generation - Theme: ${theme}, Variety: ${variety}`,
            tokensUsed: Math.floor((batchResult.usage?.total_tokens || 0) / count),
            cost: TokenEstimator.estimateCost(
              Math.floor((batchResult.usage?.prompt_tokens || 0) / count),
              Math.floor((batchResult.usage?.completion_tokens || 0) / count)
            ).totalCost,
            model: 'gpt-4',
            temperature: 0.8
          }
        });

        await content.save();
        createdContent.push({
          id: content._id,
          title: content.title,
          hook: content.hook,
          script: content.script,
          hashtags: content.hashtags,
          estimatedEngagement: content.estimatedEngagement,
          angle: contentItem.angle,
          uniqueElements: contentItem.uniqueElements
        });
      }

      // Track usage for cost monitoring
      res.locals.aiUsage = {
        tokensUsed: batchResult.usage?.total_tokens || 0,
        cost: TokenEstimator.estimateCost(
          batchResult.usage?.prompt_tokens || 0,
          batchResult.usage?.completion_tokens || 0
        ).totalCost
      };

      logger.info('Batch content generation completed', {
        userId,
        count: createdContent.length,
        platform,
        tokensUsed: batchResult.usage?.total_tokens
      });

      res.status(201).json({
        success: true,
        data: {
          contentBatch: createdContent,
          batchSummary: {
            totalGenerated: createdContent.length,
            platform: platform,
            theme: theme,
            variety: variety,
            ...batchResult.data.batchSummary
          },
          usage: {
            tokensUsed: batchResult.usage?.total_tokens || 0,
            estimatedCost: res.locals.aiUsage.cost
          }
        }
      });

    } catch (error) {
      logger.error('Batch content generation error', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during batch content generation'
        }
      });
    }
  }

  // POST /api/ai/reverse-engineer
  async reverseEngineerContent(req, res) {
    try {
      const userId = req.user.id;
      const {
        content,
        platform,
        metrics = {},
        url = '',
        adaptToStyle = true,
        generateAlternatives = 3
      } = req.body;

      // Validate input
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTENT',
            message: 'Content is required for reverse engineering'
          }
        });
      }

      // Get user's default style profile if adaptation is requested
      let styleProfile = null;
      if (adaptToStyle) {
        styleProfile = await StyleProfile.findOrCreateDefault(userId);
      }

      // Estimate tokens for cost tracking
      const estimatedTokens = TokenEstimator.estimateTokens(
        content + JSON.stringify(metrics) + platform
      );

      logger.info('Starting content reverse engineering', {
        userId,
        platform,
        contentLength: content.length,
        adaptToStyle,
        generateAlternatives,
        estimatedTokens
      });

      // Perform reverse engineering using AI service
      const analysisResult = await aiService.reverseEngineerContent(content, platform, metrics);

      if (!analysisResult.success) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'REVERSE_ENGINEERING_FAILED',
            message: 'Failed to reverse engineer content'
          }
        });
      }

      // If style adaptation is requested, create adapted content records
      const adaptedContent = [];
      if (adaptToStyle && analysisResult.data.generatedAlternatives) {
        for (const alternative of analysisResult.data.generatedAlternatives) {
          const adaptedContentRecord = new Content({
            userId,
            styleProfileId: styleProfile._id,
            type: 'analyzed',
            platform,
            contentType: 'Reel', // Default
            title: alternative.hook.substring(0, 100), // Use hook as title
            hook: alternative.hook,
            script: `${alternative.hook}\n\nAdapted from successful content with the following changes:\n${alternative.keyChanges.join('\n')}`,
            hashtags: [], // Will be populated based on original analysis
            generationMetadata: {
              prompt: `Reverse engineered from: ${content.substring(0, 200)}...`,
              tokensUsed: Math.floor((analysisResult.usage?.total_tokens || 0) / generateAlternatives),
              cost: TokenEstimator.estimateCost(
                Math.floor((analysisResult.usage?.prompt_tokens || 0) / generateAlternatives),
                Math.floor((analysisResult.usage?.completion_tokens || 0) / generateAlternatives)
              ).totalCost,
              model: 'gpt-4',
              temperature: 0.4
            }
          });

          await adaptedContentRecord.save();
          adaptedContent.push({
            id: adaptedContentRecord._id,
            version: alternative.version,
            hook: alternative.hook,
            keyChanges: alternative.keyChanges,
            expectedImpact: alternative.expectedImpact,
            createdAt: adaptedContentRecord.createdAt
          });
        }
      }

      // Track usage for cost monitoring
      res.locals.aiUsage = {
        tokensUsed: analysisResult.usage?.total_tokens || 0,
        cost: TokenEstimator.estimateCost(
          analysisResult.usage?.prompt_tokens || 0,
          analysisResult.usage?.completion_tokens || 0
        ).totalCost
      };

      logger.info('Content reverse engineering completed', {
        userId,
        platform,
        adaptedContentCount: adaptedContent.length,
        tokensUsed: analysisResult.usage?.total_tokens
      });

      res.status(200).json({
        success: true,
        data: {
          analysis: analysisResult.data,
          adaptedContent: adaptedContent,
          usage: {
            tokensUsed: analysisResult.usage?.total_tokens || 0,
            estimatedCost: res.locals.aiUsage.cost
          }
        }
      });

    } catch (error) {
      logger.error('Content reverse engineering error', {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred during content reverse engineering'
        }
      });
    }
  }
}

module.exports = new AIController();