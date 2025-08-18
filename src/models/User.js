const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Style Profile Schema
const styleProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  tone: {
    type: String,
    required: true,
    enum: ['professional', 'casual', 'humorous', 'inspirational', 'educational', 'conversational', 'authoritative', 'playful'],
    default: 'conversational'
  },
  voice: {
    type: String,
    required: true,
    enum: ['first-person', 'second-person', 'third-person', 'brand-voice'],
    default: 'first-person'
  },
  themes: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  targetAudience: {
    ageRange: {
      min: { type: Number, min: 13, max: 100 },
      max: { type: Number, min: 13, max: 100 }
    },
    interests: [{ type: String, trim: true, maxlength: 50 }],
    demographics: {
      gender: { type: String, enum: ['male', 'female', 'non-binary', 'all'] },
      location: { type: String, trim: true, maxlength: 100 },
      language: { type: String, default: 'en', maxlength: 10 }
    }
  },
  visualStyle: {
    colorPalette: [{ type: String, match: /^#[0-9A-F]{6}$/i }],
    aesthetics: [{ type: String, trim: true, maxlength: 50 }],
    contentTypes: [{
      type: String,
      enum: ['photo', 'video', 'carousel', 'story', 'reel', 'short']
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Connected Account Schema
const connectedAccountSchema = new mongoose.Schema({
  platform: {
    type: String,
    required: true,
    enum: ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook']
  },
  accountId: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String
  },
  tokenExpiresAt: {
    type: Date
  },
  permissions: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Main User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  profile: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    niche: {
      type: String,
      required: [true, 'Niche is required'],
      trim: true,
      maxlength: [100, 'Niche cannot exceed 100 characters']
    },
    platforms: [{
      type: String,
      enum: ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'facebook']
    }],
    timezone: {
      type: String,
      default: 'UTC',
      trim: true
    },
    profilePicture: {
      type: String,
      trim: true
    }
  },
  styleProfiles: [styleProfileSchema],
  connectedAccounts: [connectedAccountSchema],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'expired'],
      default: 'active'
    },
    expiresAt: {
      type: Date
    },
    stripeCustomerId: {
      type: String,
      trim: true
    }
  },
  refreshTokens: [{
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '7d' }
  }],
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLoginAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for optimal query performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'profile.niche': 1 });
userSchema.index({ 'connectedAccounts.platform': 1 });
userSchema.index({ 'connectedAccounts.accountId': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });
userSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 });

// Virtual for active style profile
userSchema.virtual('activeStyleProfile').get(function() {
  return this.styleProfiles.find(profile => profile.isActive) || this.styleProfiles[0];
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id,
    email: this.email,
    plan: this.subscription.plan
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    userId: this._id,
    type: 'refresh'
  };
  
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

// Instance method to add refresh token
userSchema.methods.addRefreshToken = async function(refreshToken) {
  // Remove old refresh tokens (keep only last 5)
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens = this.refreshTokens.slice(-4);
  }
  
  this.refreshTokens.push({ token: refreshToken });
  await this.save();
};

// Instance method to remove refresh token
userSchema.methods.removeRefreshToken = async function(refreshToken) {
  this.refreshTokens = this.refreshTokens.filter(
    tokenObj => tokenObj.token !== refreshToken
  );
  await this.save();
};

// Static method to find user by refresh token
userSchema.statics.findByRefreshToken = async function(refreshToken) {
  return this.findOne({
    'refreshTokens.token': refreshToken,
    isActive: true
  });
};

// Instance method to create default style profile
userSchema.methods.createDefaultStyleProfile = function() {
  if (this.styleProfiles.length === 0) {
    this.styleProfiles.push({
      name: 'Default Style',
      tone: 'conversational',
      voice: 'first-person',
      themes: [this.profile.niche],
      targetAudience: {
        ageRange: { min: 18, max: 35 },
        interests: [this.profile.niche],
        demographics: {
          gender: 'all',
          language: 'en'
        }
      },
      visualStyle: {
        contentTypes: ['photo', 'video', 'story']
      },
      isActive: true
    });
  }
};

// Pre-save middleware to create default style profile
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.createDefaultStyleProfile();
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;