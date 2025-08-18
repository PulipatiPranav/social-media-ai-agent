const mongoose = require('mongoose');

const styleProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  tone: {
    primary: {
      type: String,
      required: true,
      enum: ['casual', 'professional', 'humorous', 'inspirational', 'educational', 'conversational', 'authoritative', 'playful']
    },
    secondary: {
      type: String,
      enum: ['casual', 'professional', 'humorous', 'inspirational', 'educational', 'conversational', 'authoritative', 'playful']
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  voice: {
    personality: {
      type: String,
      required: true,
      enum: ['friendly', 'authoritative', 'quirky', 'relatable', 'expert', 'mentor', 'entertainer', 'storyteller']
    },
    perspective: {
      type: String,
      required: true,
      enum: ['first-person', 'second-person', 'third-person'],
      default: 'first-person'
    },
    formality: {
      type: String,
      required: true,
      enum: ['very-casual', 'casual', 'semi-formal', 'formal'],
      default: 'casual'
    }
  },
  themes: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  niche: {
    primary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    subcategories: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  targetAudience: {
    ageRange: {
      type: String,
      trim: true
    },
    interests: [{
      type: String,
      trim: true,
      maxlength: 50
    }],
    demographics: {
      type: String,
      trim: true,
      maxlength: 200
    },
    engagementStyle: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  writingPatterns: {
    sentenceLength: {
      type: String,
      enum: ['short', 'medium', 'long', 'mixed'],
      default: 'mixed'
    },
    punctuationStyle: {
      type: String,
      enum: ['minimal', 'standard', 'expressive'],
      default: 'standard'
    },
    emojiUsage: {
      type: String,
      enum: ['none', 'minimal', 'moderate', 'heavy'],
      default: 'moderate'
    },
    hashtagStyle: {
      type: String,
      enum: ['none', 'few', 'moderate', 'many'],
      default: 'moderate'
    }
  },
  contentStructure: {
    hookStyle: {
      type: String,
      enum: ['question', 'statement', 'story', 'statistic', 'quote', 'challenge'],
      default: 'question'
    },
    bodyStructure: {
      type: String,
      enum: ['list', 'narrative', 'tips', 'story', 'tutorial', 'comparison'],
      default: 'narrative'
    },
    callToAction: {
      type: String,
      enum: ['direct', 'subtle', 'question', 'none'],
      default: 'subtle'
    }
  },
  analysisMetadata: {
    sourceContent: {
      type: String,
      maxlength: 5000
    },
    analysisDate: {
      type: Date,
      default: Date.now
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  }
}, {
  timestamps: true
});

// Indexes
styleProfileSchema.index({ userId: 1, name: 1 }, { unique: true });
styleProfileSchema.index({ userId: 1, isDefault: 1 });

// Ensure only one default profile per user
styleProfileSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Virtual for profile summary
styleProfileSchema.virtual('summary').get(function() {
  return {
    name: this.name,
    tone: this.tone.primary,
    voice: this.voice.personality,
    niche: this.niche.primary,
    themes: this.themes.slice(0, 3) // Top 3 themes
  };
});

// Method to get profile for AI prompts
styleProfileSchema.methods.toAIPrompt = function() {
  return {
    tone: this.tone,
    voice: this.voice,
    themes: this.themes,
    niche: this.niche,
    targetAudience: this.targetAudience,
    writingPatterns: this.writingPatterns,
    contentStructure: this.contentStructure
  };
};

// Static method to find user's default profile
styleProfileSchema.statics.findDefaultProfile = function(userId) {
  return this.findOne({ userId, isDefault: true });
};

// Static method to find or create default profile
styleProfileSchema.statics.findOrCreateDefault = async function(userId) {
  let defaultProfile = await this.findDefaultProfile(userId);
  
  if (!defaultProfile) {
    // Create a basic default profile
    defaultProfile = new this({
      userId,
      name: 'Default Style',
      isDefault: true,
      tone: {
        primary: 'casual',
        confidence: 0.5
      },
      voice: {
        personality: 'friendly',
        perspective: 'first-person',
        formality: 'casual'
      },
      themes: ['general'],
      niche: {
        primary: 'general',
        confidence: 0.5
      },
      targetAudience: {
        ageRange: '18-35',
        demographics: 'General audience'
      }
    });
    
    await defaultProfile.save();
  }
  
  return defaultProfile;
};

module.exports = mongoose.model('StyleProfile', styleProfileSchema);