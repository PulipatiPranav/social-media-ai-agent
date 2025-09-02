const request = require('supertest');
const app = require('../../src/app');
const Trend = require('../../src/models/Trend');
const socialMediaService = require('../../src/services/socialMediaService');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

describe('Social Controller', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Create a test user and generate auth token
    testUser = new User({
      email: 'test@example.com',
      password: 'hashedpassword',
      profile: {
        name: 'Test User',
        niche: 'fitness'
      }
    });
    await testUser.save();

    authToken = jwt.sign(
      { userId: testUser._id },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Trend.deleteMany({});
  });

  describe('GET /api/social/trends/instagram', () => {
    it('should get Instagram trends with authentication', async () => {
      const response = await request(app)
        .get('/api/social/trends/instagram')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
      expect(Array.isArray(response.body.data.trends)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/social/trends/instagram')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/social/trends', () => {
    it('should get trends from all platforms', async () => {
      const response = await request(app)
        .get('/api/social/trends')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('POST /api/social/trends/refresh', () => {
    it('should manually refresh trends', async () => {
      const response = await request(app)
        .post('/api/social/trends/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ platform: 'instagram' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('trends');
    });
  });

  describe('GET /api/social/statistics', () => {
    it('should get trend statistics', async () => {
      const response = await request(app)
        .get('/api/social/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTrends');
    });
  });
});