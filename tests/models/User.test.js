const mongoose = require('mongoose');
const User = require('../../src/models/User');

describe('User Model', () => {
  // Use the global test database connection from setup.js
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('User Schema Validation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          bio: 'Test bio',
          niche: 'fitness',
          platforms: ['instagram', 'tiktok'],
          timezone: 'UTC'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.profile.name).toBe(userData.profile.name);
      expect(savedUser.profile.niche).toBe(userData.profile.niche);
      expect(savedUser.styleProfiles).toHaveLength(1); // Default style profile created
      expect(savedUser.styleProfiles[0].name).toBe('Default Style');
    });

    it('should require email, password, name, and niche', async () => {
      const user = new User({});
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      await new User(userData).save();
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should enforce minimum password length', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123', // Too short
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    it('should hash password before saving', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await user.save();

      // Password should be hashed
      expect(user.password).not.toBe('password123');
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    it('should compare passwords correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await user.save();

      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });
  });

  describe('Style Profiles', () => {
    it('should create default style profile on user creation', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await user.save();

      expect(user.styleProfiles).toHaveLength(1);
      expect(user.styleProfiles[0].name).toBe('Default Style');
      expect(user.styleProfiles[0].themes).toContain('fitness');
      expect(user.styleProfiles[0].isActive).toBe(true);
    });

    it('should validate style profile fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        },
        styleProfiles: [{
          name: 'Custom Style',
          tone: 'invalid-tone', // Invalid enum value
          voice: 'first-person'
        }]
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Connected Accounts', () => {
    it('should validate connected account fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        },
        connectedAccounts: [{
          platform: 'instagram',
          accountId: '12345',
          username: 'testuser',
          accessToken: 'token123'
        }]
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.connectedAccounts).toHaveLength(1);
      expect(savedUser.connectedAccounts[0].platform).toBe('instagram');
      expect(savedUser.connectedAccounts[0].isActive).toBe(true);
    });

    it('should validate platform enum values', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        },
        connectedAccounts: [{
          platform: 'invalid-platform', // Invalid enum value
          accountId: '12345',
          username: 'testuser',
          accessToken: 'token123'
        }]
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('JWT Token Methods', () => {
    it('should generate auth token', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await user.save();

      const token = user.generateAuthToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate refresh token', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await user.save();

      const refreshToken = user.generateRefreshToken();
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
    });

    it('should add and remove refresh tokens', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        }
      };

      const user = new User(userData);
      await user.save();

      const refreshToken = 'test-refresh-token';
      await user.addRefreshToken(refreshToken);

      expect(user.refreshTokens).toHaveLength(1);
      expect(user.refreshTokens[0].token).toBe(refreshToken);

      await user.removeRefreshToken(refreshToken);
      expect(user.refreshTokens).toHaveLength(0);
    });
  });

  describe('Database Indexes', () => {
    it('should have proper indexes defined', async () => {
      const indexes = await User.collection.getIndexes();
      
      // Check for email index
      expect(indexes).toHaveProperty('email_1');
      
      // Check for other important indexes
      const indexNames = Object.keys(indexes);
      expect(indexNames).toContain('profile.niche_1');
      expect(indexNames).toContain('connectedAccounts.platform_1');
      expect(indexNames).toContain('createdAt_-1');
    });
  });

  describe('Virtual Properties', () => {
    it('should return active style profile', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        profile: {
          name: 'Test User',
          niche: 'fitness'
        },
        styleProfiles: [
          {
            name: 'Inactive Style',
            tone: 'professional',
            voice: 'first-person',
            isActive: false
          },
          {
            name: 'Active Style',
            tone: 'casual',
            voice: 'first-person',
            isActive: true
          }
        ]
      };

      const user = new User(userData);
      await user.save();

      expect(user.activeStyleProfile.name).toBe('Active Style');
    });
  });
});