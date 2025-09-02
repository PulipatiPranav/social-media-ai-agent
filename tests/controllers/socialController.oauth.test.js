const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');
const oauthService = require('../../src/services/oauthService');
const connectedAccountService = require('../../src/services/connectedAccountService');

// Mock services
jest.mock('../../src/services/oauthService');
jest.mock('../../src/services/connectedAccountService');

// Mock environment variables
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

describe('Social Controller - OAuth Endpoints', () => {
  let authToken;
  let userId;

  beforeEach(() => {
    jest.clearAllMocks();
    
    userId = 'user123';
    authToken = jwt.sign(
      { userId: userId, email: 'test@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/social/auth/:platform', () => {
    test('should generate Instagram auth URL', async () => {
      const mockAuthUrl = 'https://api.instagram.com/oauth/authorize?client_id=test&state=test_state';
      oauthService.generateState.mockReturnValue('test_state');
      oauthService.getInstagramAuthUrl.mockReturnValue(mockAuthUrl);

      const response = await request(app)
        .get('/api/social/auth/instagram')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toBe(mockAuthUrl);
      expect(response.body.data.platform).toBe('instagram');
      expect(response.body.data.state).toBe('test_state');
      expect(oauthService.generateState).toHaveBeenCalledWith(userId, 'instagram');
    });

    test('should generate TikTok auth URL', async () => {
      const mockAuthUrl = 'https://www.tiktok.com/auth/authorize/?client_key=test&state=test_state';
      oauthService.generateState.mockReturnValue('test_state');
      oauthService.getTikTokAuthUrl.mockReturnValue(mockAuthUrl);

      const response = await request(app)
        .get('/api/social/auth/tiktok')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toBe(mockAuthUrl);
      expect(response.body.data.platform).toBe('tiktok');
    });

    test('should generate YouTube auth URL', async () => {
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=test_state';
      oauthService.generateState.mockReturnValue('test_state');
      oauthService.getYouTubeAuthUrl.mockReturnValue(mockAuthUrl);

      const response = await request(app)
        .get('/api/social/auth/youtube')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toBe(mockAuthUrl);
      expect(response.body.data.platform).toBe('youtube');
    });

    test('should return error for unsupported platform', async () => {
      const response = await request(app)
        .get('/api/social/auth/unsupported')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PLATFORM');
    });

    test('should require authentication', async () => {
      await request(app)
        .get('/api/social/auth/instagram')
        .expect(401);
    });
  });

  describe('POST /api/social/connect-account', () => {
    test('should connect Instagram account successfully', async () => {
      const requestBody = {
        platform: 'instagram',
        code: 'auth_code_123',
        state: 'valid_state'
      };

      const mockTokenData = {
        accessToken: 'access_token',
        accountId: 'account123',
        username: 'test_user',
        permissions: ['user_profile', 'user_media']
      };

      const mockAccountData = {
        platform: 'instagram',
        accountId: 'account123',
        username: 'test_user',
        isActive: true
      };

      oauthService.verifyState.mockReturnValue({ isValid: true });
      oauthService.exchangeInstagramCode.mockResolvedValue(mockTokenData);
      connectedAccountService.addConnectedAccount.mockResolvedValue({
        success: true,
        data: mockAccountData
      });

      const response = await request(app)
        .post('/api/social/connect-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBe('instagram');
      expect(response.body.data.accountId).toBe('account123');
      expect(oauthService.verifyState).toHaveBeenCalledWith('valid_state', userId, 'instagram');
      expect(oauthService.exchangeInstagramCode).toHaveBeenCalledWith('auth_code_123');
      expect(connectedAccountService.addConnectedAccount).toHaveBeenCalledWith(userId, 'instagram', mockTokenData);
    });

    test('should connect TikTok account successfully', async () => {
      const requestBody = {
        platform: 'tiktok',
        code: 'auth_code_123',
        state: 'valid_state'
      };

      const mockTokenData = {
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        accountId: 'tiktok_open_id',
        username: 'tiktok_user',
        permissions: ['user.info.basic', 'video.list'],
        expiresAt: new Date()
      };

      oauthService.verifyState.mockReturnValue({ isValid: true });
      oauthService.exchangeTikTokCode.mockResolvedValue(mockTokenData);
      connectedAccountService.addConnectedAccount.mockResolvedValue({
        success: true,
        data: { platform: 'tiktok', accountId: 'tiktok_open_id' }
      });

      const response = await request(app)
        .post('/api/social/connect-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(oauthService.exchangeTikTokCode).toHaveBeenCalledWith('auth_code_123');
    });

    test('should return error for invalid state', async () => {
      const requestBody = {
        platform: 'instagram',
        code: 'auth_code_123',
        state: 'invalid_state'
      };

      oauthService.verifyState.mockReturnValue({
        isValid: false,
        error: 'State parameter mismatch'
      });

      const response = await request(app)
        .post('/api/social/connect-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATE');
      expect(response.body.error.message).toBe('State parameter mismatch');
    });

    test('should validate request body', async () => {
      const response = await request(app)
        .post('/api/social/connect-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'invalid_platform',
          code: 'auth_code_123'
          // missing state
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/social/connected-accounts', () => {
    test('should return connected accounts', async () => {
      const mockAccounts = [
        {
          platform: 'instagram',
          accountId: 'insta123',
          username: 'insta_user',
          isActive: true
        },
        {
          platform: 'tiktok',
          accountId: 'tiktok123',
          username: 'tiktok_user',
          isActive: true
        }
      ];

      connectedAccountService.getConnectedAccounts.mockResolvedValue({
        success: true,
        data: mockAccounts
      });

      const response = await request(app)
        .get('/api/social/connected-accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accounts).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(connectedAccountService.getConnectedAccounts).toHaveBeenCalledWith(userId, undefined);
    });

    test('should filter by platform', async () => {
      const mockAccounts = [
        {
          platform: 'instagram',
          accountId: 'insta123',
          username: 'insta_user',
          isActive: true
        }
      ];

      connectedAccountService.getConnectedAccounts.mockResolvedValue({
        success: true,
        data: mockAccounts
      });

      const response = await request(app)
        .get('/api/social/connected-accounts?platform=instagram')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accounts).toHaveLength(1);
      expect(response.body.data.accounts[0].platform).toBe('instagram');
      expect(connectedAccountService.getConnectedAccounts).toHaveBeenCalledWith(userId, 'instagram');
    });
  });

  describe('DELETE /api/social/disconnect-account', () => {
    test('should disconnect account successfully', async () => {
      const requestBody = {
        platform: 'instagram',
        accountId: 'account123'
      };

      connectedAccountService.removeConnectedAccount.mockResolvedValue({
        success: true,
        message: 'Account disconnected successfully'
      });

      const response = await request(app)
        .delete('/api/social/disconnect-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Account disconnected successfully');
      expect(connectedAccountService.removeConnectedAccount).toHaveBeenCalledWith(userId, 'instagram', 'account123');
    });

    test('should validate request body', async () => {
      const response = await request(app)
        .delete('/api/social/disconnect-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platform: 'instagram'
          // missing accountId
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/social/verify-account', () => {
    test('should verify account successfully', async () => {
      const requestBody = {
        platform: 'instagram',
        accountId: 'account123'
      };

      const mockVerificationResult = {
        success: true,
        data: { id: 'account123', username: 'test_user' },
        message: 'Account verification successful'
      };

      connectedAccountService.verifyAccountPermissions.mockResolvedValue(mockVerificationResult);

      const response = await request(app)
        .post('/api/social/verify-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockVerificationResult.data);
      expect(response.body.message).toBe('Account verification successful');
      expect(connectedAccountService.verifyAccountPermissions).toHaveBeenCalledWith(userId, 'instagram', 'account123');
    });

    test('should handle verification failure', async () => {
      const requestBody = {
        platform: 'instagram',
        accountId: 'account123'
      };

      connectedAccountService.verifyAccountPermissions.mockResolvedValue({
        success: false,
        error: 'Invalid or expired token'
      });

      const response = await request(app)
        .post('/api/social/verify-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCOUNT_VERIFICATION_FAILED');
      expect(response.body.error.message).toBe('Invalid or expired token');
    });
  });

  describe('GET /api/social/user-analytics', () => {
    test('should get user analytics', async () => {
      const mockAnalytics = {
        success: true,
        data: {
          followers: 1000,
          engagement_rate: 0.05,
          impressions: 50000
        }
      };

      connectedAccountService.getAccountAnalytics.mockResolvedValue(mockAnalytics);

      const response = await request(app)
        .get('/api/social/user-analytics?platform=instagram&accountId=account123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalytics.data);
      expect(connectedAccountService.getAccountAnalytics).toHaveBeenCalledWith(
        userId,
        'instagram',
        'account123',
        {}
      );
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/social/user-analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/social/sync-account', () => {
    test('should sync account data', async () => {
      const requestBody = {
        platform: 'instagram',
        accountId: 'account123'
      };

      const mockSyncResult = {
        success: true,
        data: { id: 'account123', username: 'updated_user' },
        message: 'Account data synced successfully'
      };

      connectedAccountService.syncAccountData.mockResolvedValue(mockSyncResult);

      const response = await request(app)
        .post('/api/social/sync-account')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSyncResult.data);
      expect(response.body.message).toBe('Account data synced successfully');
      expect(connectedAccountService.syncAccountData).toHaveBeenCalledWith(userId, 'instagram', 'account123');
    });
  });
});