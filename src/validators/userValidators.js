const Joi = require('joi');

// User registration validation
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
  profile: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    bio: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Bio cannot exceed 500 characters'
      }),
    niche: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Niche must be at least 2 characters long',
        'string.max': 'Niche cannot exceed 100 characters',
        'any.required': 'Niche is required'
      }),
    platforms: Joi.array()
      .items(Joi.string().valid('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook'))
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one platform must be selected',
        'any.required': 'Platforms are required'
      }),
    timezone: Joi.string()
      .trim()
      .default('UTC')
  }).required()
});

// User login validation
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Profile update validation
const updateProfileSchema = Joi.object({
  profile: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      }),
    bio: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Bio cannot exceed 500 characters'
      }),
    niche: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.min': 'Niche must be at least 2 characters long',
        'string.max': 'Niche cannot exceed 100 characters'
      }),
    platforms: Joi.array()
      .items(Joi.string().valid('instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook'))
      .min(1)
      .messages({
        'array.min': 'At least one platform must be selected'
      }),
    timezone: Joi.string()
      .trim(),
    profilePicture: Joi.string()
      .uri()
      .allow('')
      .messages({
        'string.uri': 'Profile picture must be a valid URL'
      })
  })
});

// Style profile validation
const styleProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Style profile name must be at least 2 characters long',
      'string.max': 'Style profile name cannot exceed 100 characters',
      'any.required': 'Style profile name is required'
    }),
  tone: Joi.string()
    .valid('professional', 'casual', 'humorous', 'inspirational', 'educational', 'conversational', 'authoritative', 'playful')
    .required()
    .messages({
      'any.only': 'Invalid tone selected',
      'any.required': 'Tone is required'
    }),
  voice: Joi.string()
    .valid('first-person', 'second-person', 'third-person', 'brand-voice')
    .required()
    .messages({
      'any.only': 'Invalid voice selected',
      'any.required': 'Voice is required'
    }),
  themes: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .messages({
      'array.max': 'Maximum 10 themes allowed',
      'string.max': 'Each theme cannot exceed 50 characters'
    }),
  targetAudience: Joi.object({
    ageRange: Joi.object({
      min: Joi.number().integer().min(13).max(100),
      max: Joi.number().integer().min(13).max(100).greater(Joi.ref('min'))
    }).messages({
      'number.greater': 'Maximum age must be greater than minimum age'
    }),
    interests: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(20)
      .messages({
        'array.max': 'Maximum 20 interests allowed',
        'string.max': 'Each interest cannot exceed 50 characters'
      }),
    demographics: Joi.object({
      gender: Joi.string().valid('male', 'female', 'non-binary', 'all'),
      location: Joi.string().trim().max(100),
      language: Joi.string().trim().max(10).default('en')
    })
  }),
  visualStyle: Joi.object({
    colorPalette: Joi.array()
      .items(Joi.string().pattern(/^#[0-9A-F]{6}$/i))
      .max(10)
      .messages({
        'array.max': 'Maximum 10 colors allowed',
        'string.pattern.base': 'Colors must be in hex format (e.g., #FF5733)'
      }),
    aesthetics: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10)
      .messages({
        'array.max': 'Maximum 10 aesthetics allowed',
        'string.max': 'Each aesthetic cannot exceed 50 characters'
      }),
    contentTypes: Joi.array()
      .items(Joi.string().valid('photo', 'video', 'carousel', 'story', 'reel', 'short'))
      .min(1)
      .messages({
        'array.min': 'At least one content type must be selected'
      })
  })
});

// Refresh token validation
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// Password change validation
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'New password is required'
    }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'New password confirmation is required'
    })
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  styleProfileSchema,
  refreshTokenSchema,
  changePasswordSchema
};