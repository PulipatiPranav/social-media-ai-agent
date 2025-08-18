const Joi = require('joi');

// Style analysis validation
const analyzeStyleSchema = Joi.object({
  content: Joi.string()
    .min(50)
    .max(10000)
    .required()
    .messages({
      'string.min': 'Content must be at least 50 characters long for meaningful analysis',
      'string.max': 'Content must be less than 10,000 characters',
      'any.required': 'Content is required for style analysis'
    }),
  
  profileName: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional()
    .messages({
      'string.min': 'Profile name cannot be empty',
      'string.max': 'Profile name must be less than 100 characters'
    }),
  
  setAsDefault: Joi.boolean()
    .optional()
    .default(false)
});

// Style profile update validation
const updateStyleProfileSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .optional(),
  
  isDefault: Joi.boolean()
    .optional(),
  
  tone: Joi.object({
    primary: Joi.string()
      .valid('casual', 'professional', 'humorous', 'inspirational', 'educational', 'conversational', 'authoritative', 'playful')
      .optional(),
    secondary: Joi.string()
      .valid('casual', 'professional', 'humorous', 'inspirational', 'educational', 'conversational', 'authoritative', 'playful')
      .optional(),
    confidence: Joi.number()
      .min(0)
      .max(1)
      .optional()
  }).optional(),
  
  voice: Joi.object({
    personality: Joi.string()
      .valid('friendly', 'authoritative', 'quirky', 'relatable', 'expert', 'mentor', 'entertainer', 'storyteller')
      .optional(),
    perspective: Joi.string()
      .valid('first-person', 'second-person', 'third-person')
      .optional(),
    formality: Joi.string()
      .valid('very-casual', 'casual', 'semi-formal', 'formal')
      .optional()
  }).optional(),
  
  themes: Joi.array()
    .items(Joi.string().max(50).trim())
    .max(20)
    .optional(),
  
  niche: Joi.object({
    primary: Joi.string()
      .max(50)
      .trim()
      .optional(),
    subcategories: Joi.array()
      .items(Joi.string().max(50).trim())
      .max(10)
      .optional(),
    confidence: Joi.number()
      .min(0)
      .max(1)
      .optional()
  }).optional(),
  
  targetAudience: Joi.object({
    ageRange: Joi.string()
      .max(50)
      .trim()
      .optional(),
    interests: Joi.array()
      .items(Joi.string().max(50).trim())
      .max(20)
      .optional(),
    demographics: Joi.string()
      .max(200)
      .trim()
      .optional(),
    engagementStyle: Joi.string()
      .max(100)
      .trim()
      .optional()
  }).optional(),
  
  writingPatterns: Joi.object({
    sentenceLength: Joi.string()
      .valid('short', 'medium', 'long', 'mixed')
      .optional(),
    punctuationStyle: Joi.string()
      .valid('minimal', 'standard', 'expressive')
      .optional(),
    emojiUsage: Joi.string()
      .valid('none', 'minimal', 'moderate', 'heavy')
      .optional(),
    hashtagStyle: Joi.string()
      .valid('none', 'few', 'moderate', 'many')
      .optional()
  }).optional(),
  
  contentStructure: Joi.object({
    hookStyle: Joi.string()
      .valid('question', 'statement', 'story', 'statistic', 'quote', 'challenge')
      .optional(),
    bodyStructure: Joi.string()
      .valid('list', 'narrative', 'tips', 'story', 'tutorial', 'comparison')
      .optional(),
    callToAction: Joi.string()
      .valid('direct', 'subtle', 'question', 'none')
      .optional()
  }).optional()
});

// Content generation validation
const generateContentSchema = Joi.object({
  styleProfileId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid style profile ID format'
    }),
  
  platform: Joi.string()
    .valid('Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn', 'Facebook')
    .default('Instagram'),
  
  contentType: Joi.string()
    .valid('Reel', 'Post', 'Story', 'Video', 'Short', 'Tweet', 'Article')
    .default('Reel'),
  
  targetLength: Joi.string()
    .max(50)
    .default('30-60 seconds'),
  
  trends: Joi.array()
    .items(Joi.object({
      id: Joi.string().optional(),
      title: Joi.string().max(200).optional(),
      hashtags: Joi.array().items(Joi.string().max(50)).optional(),
      description: Joi.string().max(500).optional()
    }))
    .max(5)
    .optional(),
  
  additionalContext: Joi.string()
    .max(1000)
    .optional(),
  
  customPrompt: Joi.string()
    .max(500)
    .optional()
});

// Batch generation validation
const batchGenerateSchema = Joi.object({
  styleProfileId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  
  platform: Joi.string()
    .valid('Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn', 'Facebook')
    .default('Instagram'),
  
  theme: Joi.string()
    .max(100)
    .default('General'),
  
  count: Joi.number()
    .integer()
    .min(2)
    .max(20)
    .default(10)
    .messages({
      'number.min': 'Must generate at least 2 content pieces',
      'number.max': 'Cannot generate more than 20 content pieces at once'
    }),
  
  trends: Joi.array()
    .items(Joi.object({
      id: Joi.string().optional(),
      title: Joi.string().max(200).optional(),
      hashtags: Joi.array().items(Joi.string().max(50)).optional(),
      description: Joi.string().max(500).optional()
    }))
    .max(5)
    .optional(),
  
  variety: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .messages({
      'any.only': 'Variety must be low, medium, or high'
    })
});

// Reverse engineering validation
const reverseEngineerSchema = Joi.object({
  content: Joi.string()
    .min(20)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Content must be at least 20 characters long',
      'string.max': 'Content must be less than 5,000 characters',
      'any.required': 'Content is required for analysis'
    }),
  
  platform: Joi.string()
    .valid('Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn', 'Facebook')
    .required(),
  
  metrics: Joi.object({
    views: Joi.number().integer().min(0).optional(),
    likes: Joi.number().integer().min(0).optional(),
    shares: Joi.number().integer().min(0).optional(),
    comments: Joi.number().integer().min(0).optional(),
    engagementRate: Joi.number().min(0).max(100).optional()
  }).optional(),
  
  url: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'URL must be a valid web address'
    }),
  
  adaptToStyle: Joi.boolean()
    .default(true),
  
  generateAlternatives: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .default(3)
});

// Query parameter validation
const getStyleProfilesQuery = Joi.object({
  includeAnalysisData: Joi.string()
    .valid('true', 'false')
    .default('false')
});

// MongoDB ObjectId validation
const mongoIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format'
  });

// Params validation schemas
const styleProfileParamsSchema = Joi.object({
  id: mongoIdSchema
});

module.exports = {
  analyzeStyleSchema,
  updateStyleProfileSchema,
  generateContentSchema,
  batchGenerateSchema,
  reverseEngineerSchema,
  getStyleProfilesQuery,
  mongoIdSchema,
  styleProfileParamsSchema
};