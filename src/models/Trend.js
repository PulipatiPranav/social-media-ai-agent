const mongoose = require('mongoose');

const trendSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['instagram', 'tiktok', 'youtube'],
    required: true,
    index: true
  },
  trendId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  audioTrack: {
    id: String,
    title: String,
    artist: String,
    duration: Number,
    url: String
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    uses: {
      type: Number,
      default: 0
    },
    growth: {
      type: Number,
      default: 0
    },
    engagementRate: {
      type: Number,
      default: 0
    }
  },
  niche: [{
    type: String,
    trim: true,
    index: true
  }],
  relevanceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  metadata: {
    originalUrl: String,
    thumbnailUrl: String,
    duration: Number,
    language: String,
    region: String
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
trendSchema.index({ platform: 1, niche: 1, isActive: 1 });
trendSchema.index({ relevanceScore: -1, createdAt: -1 });
trendSchema.index({ 'metrics.growth': -1, createdAt: -1 });

// Static method to find trends by niche and platform
trendSchema.statics.findByNicheAndPlatform = function(niche, platform, limit = 20) {
  return this.find({
    platform,
    niche: { $in: Array.isArray(niche) ? niche : [niche] },
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .sort({ relevanceScore: -1, 'metrics.growth': -1 })
  .limit(limit);
};

// Static method to find trending content across platforms
trendSchema.statics.findTrending = function(platforms = ['instagram', 'tiktok', 'youtube'], limit = 50) {
  return this.find({
    platform: { $in: platforms },
    isActive: true,
    expiresAt: { $gt: new Date() },
    'metrics.growth': { $gt: 0 }
  })
  .sort({ 'metrics.growth': -1, relevanceScore: -1 })
  .limit(limit);
};

// Instance method to calculate trend score
trendSchema.methods.calculateTrendScore = function() {
  const ageInHours = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 100 - (ageInHours / 24) * 10); // Decreases over 10 days
  const engagementScore = Math.min(100, this.metrics.engagementRate * 10);
  const growthScore = Math.min(100, this.metrics.growth / 1000);
  
  return (recencyScore * 0.3 + engagementScore * 0.4 + growthScore * 0.3);
};

module.exports = mongoose.model('Trend', trendSchema);