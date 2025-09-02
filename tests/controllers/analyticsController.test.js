const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Analytics = require('../../src/models/Analytics');
const jwt = require('jsonwebtoken');

describe('Analytics Controller', () => {
  let testUser;
  let authToken;

  beforeEach(async () => {
    // Create test user
    testUser = new User({
      email: 'analytics-test@example.com',
      password: 'password123',
      profile: {
        name: 'Analytics Test User',
        niche: 'fitness'
      }
    });
    await testUser.save();

    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser._id.toString() },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: /analytics-test/ });
    await Analytics.deleteMany({ userId: testUser._id });
  });

  describe('GET /api/analytics/performance', () => {
    it('should get performance analytics successfully', async () => {
      const response = await request(app)
        .get('/api/analytics/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toBe('Performance analytics retrieved successfully');
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/analytics/performance?platform=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/analytics/performance')
        .expect(401);
    });
  });

  describe('GET /api/analytics/dashboard', () => {
    it('should get dashboard data successfully', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.timeframe).toBe('30d');
      expect(response.body.data.dateRange).toBeDefined();
    });

    it('should accept different timeframes', async () => {
      const response = await request(app)
        .get('/api/analytics/dashboard?timeframe=7d')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.timeframe).toBe('7d');
    });
  });

  describe('GET /api/analytics/engagement', () => {
    it('should get engagement metrics successfully', async () => {
      const response = await request(app)
        .get('/api/analytics/engagement')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toBe('Engagement metrics retrieved successfully');
    });
  });

  describe('POST /api/analytics/sync', () => {
    it('should handle sync request', async () => {
      const response = await request(app)
        .post('/api/analytics/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'instagram'
        })
        .expect(400); // Expected to fail since no connected accounts

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/analytics/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/analytics/ai-insights', () => {
    it('should get AI insights successfully', async () => {
      const response = await request(app)
        .get('/api/analytics/ai-insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.insights).toBeDefined();
      expect(response.body.message).toBe('AI insights generated successfully');
    });
  });

  describe('POST /api/analytics/auto-sync', () => {
    it('should start auto-sync successfully', async () => {
      const response = await request(app)
        .post('/api/analytics/auto-sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'start',
          intervalMinutes: 120
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('start');
      expect(response.body.data.intervalMinutes).toBe(120);
    });

    it('should stop auto-sync successfully', async () => {
      const response = await request(app)
        .post('/api/analytics/auto-sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'stop'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('stop');
    });

    it('should validate action parameter', async () => {
      const response = await request(app)
        .post('/api/analytics/auto-sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/analytics/sync-status', () => {
    it('should get sync status successfully', async () => {
      const response = await request(app)
        .get('/api/analytics/sync-status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.userSync).toBeDefined();
      expect(response.body.data.schedulerStatus).toBeDefined();
    });
  });
});