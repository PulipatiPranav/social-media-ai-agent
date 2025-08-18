const mongoose = require('mongoose');

const sceneSchema = new mongoose.Schema({
  sceneNumber: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  duration: {
    type: String,
    maxlength: 50
  },
  cameraAngle: {
    type: String,
    maxlength: 100
  },
  props: [{
    type: String,
    maxlength: 100
  }],
  transitions: {
    type: String,
    maxlength: 200
  }
}, { _id: false });

const audioSuggestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['trending', 'original', 'voiceover'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 300
  },
  timing: {
    type: String,
    maxlength: 100
  }
}, { _id: false });

const contentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  styleProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StyleProfile',
    required: true
  },
  type: {
    type: String,
    enum: ['generated', 'analyzed', 'scheduled'],
    default: 'generated'
  },
  platform: {
    type: String,
    enum: ['Instagram', 'TikTok', 'YouTube', 'Twitter', 'LinkedIn', 'Facebook'],
    required: true
  },
  contentType: {
    type: String,
    enum: ['Reel', 'Post', 'Story', 'Video', 'Short', 'Tweet', 'Article'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  hook: {
    type: String,
    required: true,
    maxlength: 500
  },
  script: {
    type: String,
    required: true,
    maxlength: 5000
  },
  sceneBreakdown: [sceneSchema],
  hashtags: [{
    type: String,
    maxlength: 50
  }],
  audioSuggestions: [audioSuggestionSchema],
  culturalReferences: [{
    type: String,
    maxlength: 200
  }],
  callToAction: {
    type: String,
    maxlength: 300
  },
  estimatedEngagement: {
    viralPotential: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    targetAudience: {
      type: String,
      maxlength: 200
    },
    bestPostingTime: {
      type: String,
      maxlength: 100
    }
  },
  trends: [{
    id: String,
    title: String,
    hashtags: [String],
    description: String
  }],
  generationMetadata: {
    prompt: {
      type: String,
      maxlength: 2000
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    cost: {
      type: Number,
      default: 0
    },
    model: {
      type: String,
      default: 'gpt-4'
    },
    temperature: {
      type: Number,
      default: 0.7
    }
  },
  performance: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    }
  },
  scheduledFor: Date,
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Indexes
contentSchema.index({ userId: 1, createdAt: -1 });
contentSchema.index({ userId: 1, status: 1 });
contentSchema.index({ userId: 1, platform: 1 });
contentSchema.index({ styleProfileId: 1 });

// Virtual for content summary
contentSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    title: this.title,
    platform: this.platform,
    contentType: this.contentType,
    viralPotential: this.estimatedEngagement.viralPotential,
    status: this.status,
    createdAt: this.createdAt
  };
});

// Method to format for export
contentSchema.methods.toExport = function() {
  return {
    title: this.title,
    hook: this.hook,
    script: this.script,
    sceneBreakdown: this.sceneBreakdown,
    hashtags: this.hashtags.map(tag => `#${tag}`).join(' '),
    audioSuggestions: this.audioSuggestions,
    culturalReferences: this.culturalReferences,
    callToAction: this.callToAction,
    platform: this.platform,
    contentType: this.contentType,
    createdAt: this.createdAt
  };
};

// Static method to find user's content
contentSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.platform) {
    query.where('platform', options.platform);
  }
  
  if (options.status) {
    query.where('status', options.status);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query.sort({ createdAt: -1 });
};

module.exports = mongoose.model('Content', contentSchema);