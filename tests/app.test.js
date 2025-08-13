const request = require('supertest');
const app = require('../src/app');

describe('App Foundation', () => {
  describe('GET /api/health', () => {
    it('should return health check status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Social Media Creative Manager API is running',
        environment: expect.any(String)
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Welcome to Social Media Creative Manager API',
        version: '1.0.0',
        endpoints: expect.any(Object)
      });
    });
  });

  describe('404 Handler', () => {
    it('should handle non-existent routes', async () => {
      const response = await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining("Can't find /api/non-existent-route")
        }
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      // Check for helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });
});