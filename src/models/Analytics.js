const mongoose = require('mongoose');

// Analytics data schema for storing performance metrics
const analyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    index: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook'],
    required: true,
    index: true
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  mediaId: {
    type: String,
    required: true,
    index: true
  },
  mediaType: {
    type: String,
    enum: ['photo', 'video', 'carousel', 'story', 'reel', 'short', 'post'],
    required: true
  },
  metrics: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    likes: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    },
    comments: {
      type: Number,
      default: 0,
      min: 0
    },
    saves: {
      type: Number,
      default: 0,
      min: 0
    },
    engagementRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    reachRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    impressions: {
      type: Number,
      default: 0,
      min: 0
    },
    reach: {
      type: Number,
      default: 0,
      min: 0
    },
    // Platform-specific metrics
    platformSpecific: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  demographics: {
    ageGroups: [{
      range: String, // e.g., "18-24", "25-34"
      percentage: Number
    }],
    genderDistribution: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    topLocations: [{
      country: String,
      city: String,
      percentage: Number
    }],
    interests: [String]
  },
  performance: {
    hourlyBreakdown: [{
      hour: { type: Number, min: 0, max: 23 },
      engagement: Number,
      views: Number
    }],
    dailyGrowth: {
      type: Number,
      default: 0
    },
    weeklyGrowth: {
      type: Number,
      default: 0
    },
    monthlyGrowth: {
      type: Number,
      default: 0
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  syncedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
analyticsSchema.index({ userId: 1, platform: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, contentId: 1, timestamp: -1 });
analyticsSchema.index({ platform: 1, mediaId: 1, timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });
analyticsSchema.index({ syncedAt: -1 });

// Virtual for total engagement
analyticsSchema.virtual('totalEngagement').get(function() {
  return this.metrics.likes + this.metrics.comments + this.metrics.shares + (this.metrics.saves || 0);
});

// Virtual for engagement rate calculation
analyticsSchema.virtual('calculatedEngagementRate').get(function() {
  if (this.metrics.impressions > 0) {
    return ((this.totalEngagement / this.metrics.impressions) * 100).toFixed(2);
  }
  return 0;
});

// Static method to get user analytics summary
analyticsSchema.statics.getUserAnalyticsSummary = async function(userId, options = {}) {
  const {
    platform,
    startDate,
    endDate,
    limit = 100
  } = options;

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
    { $sort: { timestamp: -1 } },
    { $limit: limit },
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$metrics.views' },
        totalLikes: { $sum: '$metrics.likes' },
        totalComments: { $sum: '$metrics.comments' },
        totalShares: { $sum: '$metrics.shares' },
        totalSaves: { $sum: '$metrics.saves' },
        totalImpressions: { $sum: '$metrics.impressions' },
        totalReach: { $sum: '$metrics.reach' },
        avgEngagementRate: { $avg: '$metrics.engagementRate' },
        avgReachRate: { $avg: '$metrics.reachRate' },
        contentCount: { $sum: 1 },
        platforms: { $addToSet: '$platform' },
        latestSync: { $max: '$syncedAt' }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalImpressions: 0,
    totalReach: 0,
    avgEngagementRate: 0,
    avgReachRate: 0,
    contentCount: 0,
    platforms: [],
    latestSync: null
  };
};

// Static method to get platform-specific analytics
analyticsSchema.statics.getPlatformAnalytics = async function(userId, platform, options = {}) {
  const {
    startDate,
    endDate,
    groupBy = 'day', // day, week, month
    limit = 30
  } = options;

  let matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    platform: platform,
    isActive: true
  };

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }

  let groupStage;
  switch (groupBy) {
    case 'week':
      groupStage = {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          },
          date: { $first: '$timestamp' },
          views: { $sum: '$metrics.views' },
          likes: { $sum: '$metrics.likes' },
          comments: { $sum: '$metrics.comments' },
          shares: { $sum: '$metrics.shares' },
          saves: { $sum: '$metrics.saves' },
          impressions: { $sum: '$metrics.impressions' },
          reach: { $sum: '$metrics.reach' },
          avgEngagementRate: { $avg: '$metrics.engagementRate' },
          contentCount: { $sum: 1 }
        }
      };
      break;
    case 'month':
      groupStage = {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          },
          date: { $first: '$timestamp' },
          views: { $sum: '$metrics.views' },
          likes: { $sum: '$metrics.likes' },
          comments: { $sum: '$metrics.comments' },
          shares: { $sum: '$metrics.shares' },
          saves: { $sum: '$metrics.saves' },
          impressions: { $sum: '$metrics.impressions' },
          reach: { $sum: '$metrics.reach' },
          avgEngagementRate: { $avg: '$metrics.engagementRate' },
          contentCount: { $sum: 1 }
        }
      };
      break;
    default: // day
      groupStage = {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          date: { $first: '$timestamp' },
          views: { $sum: '$metrics.views' },
          likes: { $sum: '$metrics.likes' },
          comments: { $sum: '$metrics.comments' },
          shares: { $sum: '$metrics.shares' },
          saves: { $sum: '$metrics.saves' },
          impressions: { $sum: '$metrics.impressions' },
          reach: { $sum: '$metrics.reach' },
          avgEngagementRate: { $avg: '$metrics.engagementRate' },
          contentCount: { $sum: 1 }
        }
      };
  }

  const pipeline = [
    { $match: matchStage },
    groupStage,
    { $sort: { date: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        date: 1,
        views: 1,
        likes: 1,
        comments: 1,
        shares: 1,
        saves: 1,
        impressions: 1,
        reach: 1,
        avgEngagementRate: { $round: ['$avgEngagementRate', 2] },
        contentCount: 1,
        totalEngagement: { $add: ['$likes', '$comments', '$shares', '$saves'] }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

// Static method to get content performance analytics
analyticsSchema.statics.getContentPerformance = async function(userId, contentId) {
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        contentId: new mongoose.Types.ObjectId(contentId),
        isActive: true
      }
    },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$platform',
        latestMetrics: { $first: '$metrics' },
        demographics: { $first: '$demographics' },
        performance: { $first: '$performance' },
        mediaId: { $first: '$mediaId' },
        mediaType: { $first: '$mediaType' },
        syncedAt: { $first: '$syncedAt' }
      }
    }
  ];

  return await this.aggregate(pipeline);
};

// Static method to find analytics by media ID
analyticsSchema.statics.findByMediaId = async function(userId, platform, mediaId) {
  return await this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    platform: platform,
    mediaId: mediaId,
    isActive: true
  }).sort({ timestamp: -1 });
};

// Instance method to update metrics
analyticsSchema.methods.updateMetrics = function(newMetrics) {
  Object.assign(this.metrics, newMetrics);
  this.syncedAt = new Date();
  return this.save();
};

// Instance method to calculate growth rates
analyticsSchema.methods.calculateGrowthRates = async function() {
  const previousAnalytics = await this.constructor.findOne({
    userId: this.userId,
    platform: this.platform,
    mediaId: this.mediaId,
    timestamp: { $lt: this.timestamp },
    isActive: true
  }).sort({ timestamp: -1 });

  if (previousAnalytics) {
    const timeDiff = this.timestamp - previousAnalytics.timestamp;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    if (daysDiff <= 1) {
      this.performance.dailyGrowth = this.metrics.views - previousAnalytics.metrics.views;
    } else if (daysDiff <= 7) {
      this.performance.weeklyGrowth = this.metrics.views - previousAnalytics.metrics.views;
    } else if (daysDiff <= 30) {
      this.performance.monthlyGrowth = this.metrics.views - previousAnalytics.metrics.views;
    }
  }

  return this.save();
};

module.exports = mongoose.model('Analytics', analyticsSchema);