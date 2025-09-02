const connectedAccountService = require('../../src/services/connectedAccountService');
const User = require('../../src/models/User');
const oauthService = require('../../src/services/oauthService');

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/services/oauthService');

// Mock environment variables
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';

describe('ConnectedAccountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addConnectedAccount', () => {
    test('should add new connected account', async () => {
      const userId = 'user123';
      const platform = 'instagram';
      const accountData = {
        accessToken: 'access_token',
        accountId: 'account123',
        username: 'test_user',
        permissions: ['user_profile', 'user_media']
      };

      const mockUser = {
        _id: userId,
        connectedAccounts: [],
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(mockUser);
      oauthService.encryptToken.mockReturnValue('encrypted_token');

      const result = await connectedAccountService.addConnectedAccount(userId, platform, accountData);

      expect(result.success).toBe(true);
      expect(result.data.platform).toBe(platform);
      expect(result.data.accountId).toBe(accountData.accountId);
      expect(result.data.username).toBe(accountData.username);
      expect(result.data).not.toHaveProperty('accessToken');
      expect(mockUser.connectedAccounts).toHaveLength(1);
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should update existing connected account', async () => {
      const userId = 'user123';
      const platform = 'instagram';
      const accountData = {
        accessToken: 'new_access_token',
        accountId: 'account123',
        username: 'updated_user',
        permissions: ['user_profile', 'user_media']
      };

      const existingAccount = {
        platform: platform,
        accountId: 'account123',
        username: 'old_user',
        accessToken: 'old_encrypted_token',
        toObject: jest.fn().mockReturnValue({
          platform: platform,
          accountId: 'account123',
          username: 'old_user',
          accessToken: 'old_encrypted_token'
        })
      };

      const mockUser = {
        _id: userId,
        connectedAccounts: [existingAccount],
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(mockUser);
      oauthService.encryptToken.mockReturnValue('new_encrypted_token');

      const result = await connectedAccountService.addConnectedAccount(userId, platform, accountData);

      expect(result.success).toBe(true);
      expect(result.data.username).toBe('updated_user');
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(
        connectedAccountService.addConnectedAccount('nonexistent', 'instagram', {})
      ).rejects.toThrow('User not found');
    });
  });

  describe('getConnectedAccounts', () => {
    test('should return all connected accounts', async () => {
      const userId = 'user123';
      const mockAccounts = [
        {
          platform: 'instagram',
          accountId: 'insta123',
          username: 'insta_user',
          isActive: true,
          toObject: jest.fn().mockReturnValue({
            platform: 'instagram',
            accountId: 'insta123',
            username: 'insta_user',
            isActive: true
          })
        },
        {
          platform: 'tiktok',
          accountId: 'tiktok123',
          username: 'tiktok_user',
          isActive: true,
          toObject: jest.fn().mockReturnValue({
            platform: 'tiktok',
            accountId: 'tiktok123',
            username: 'tiktok_user',
            isActive: true
          })
        }
      ];

      const mockUser = {
        connectedAccounts: mockAccounts
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await connectedAccountService.getConnectedAccounts(userId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].platform).toBe('instagram');
      expect(result.data[1].platform).toBe('tiktok');
    });

    test('should filter by platform', async () => {
      const userId = 'user123';
      const mockAccounts = [
        {
          platform: 'instagram',
          accountId: 'insta123',
          username: 'insta_user',
          isActive: true,
          toObject: jest.fn().mockReturnValue({
            platform: 'instagram',
            accountId: 'insta123',
            username: 'insta_user',
            isActive: true
          })
        },
        {
          platform: 'tiktok',
          accountId: 'tiktok123',
          username: 'tiktok_user',
          isActive: true,
          toObject: jest.fn().mockReturnValue({
            platform: 'tiktok',
            accountId: 'tiktok123',
            username: 'tiktok_user',
            isActive: true
          })
        }
      ];

      const mockUser = {
        connectedAccounts: mockAccounts
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser)
      });

      const result = await connectedAccountService.getConnectedAccounts(userId, 'instagram');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].platform).toBe('instagram');
    });
  });

  describe('removeConnectedAccount', () => {
    test('should deactivate connected account', async () => {
      const userId = 'user123';
      const platform = 'instagram';
      const accountId = 'account123';

      const mockAccount = {
        platform: platform,
        accountId: accountId,
        isActive: true
      };

      const mockUser = {
        connectedAccounts: [mockAccount],
        save: jest.fn().mockResolvedValue(true)
      };

      User.findById.mockResolvedValue(mockUser);

      const result = await connectedAccountService.removeConnectedAccount(userId, platform, accountId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Account disconnected successfully');
      expect(mockAccount.isActive).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should throw error if account not found', async () => {
      const mockUser = {
        connectedAccounts: []
      };

      User.findById.mockResolvedValue(mockUser);

      await expect(
        connectedAccountService.removeConnectedAccount('user123', 'instagram', 'nonexistent')
      ).rejects.toThrow('Connected account not found');
    });
  });

  describe('getPlatformClient', () => {
    test('should return Instagram client', async () => {
      const userId = 'user123';
      const platform = 'instagram';

      const mockAccount = {
        platform: platform,
        accountId: 'account123',
        accessToken: 'encrypted_token',
        isActive: true,
        tokenExpiresAt: new Date(Date.now() + 3600000) // 1 hour from now
      };

      const mockUser = {
        connectedAccounts: [mockAccount]
      };

      User.findById.mockResolvedValue(mockUser);
      oauthService.decryptToken.mockReturnValue('decrypted_token');

      const client = await connectedAccountService.getPlatformClient(userId, platform);

      expect(client).toBeDefined();
      expect(client.constructor.name).toBe('InstagramClient');
    });

    test('should throw error if no account found', async () => {
      const mockUser = {
        connectedAccounts: []
      };

      User.findById.mockResolvedValue(mockUser);

      await expect(
        connectedAccountService.getPlatformClient('user123', 'instagram')
      ).rejects.toThrow('No active instagram account found');
    });

    test('should throw error for unsupported platform', async () => {
      const mockAccount = {
        platform: 'unsupported',
        accountId: 'account123',
        accessToken: 'encrypted_token',
        isActive: true,
        tokenExpiresAt: new Date(Date.now() + 3600000)
      };

      const mockUser = {
        connectedAccounts: [mockAccount]
      };

      User.findById.mockResolvedValue(mockUser);
      oauthService.decryptToken.mockReturnValue('decrypted_token');

      await expect(
        connectedAccountService.getPlatformClient('user123', 'unsupported')
      ).rejects.toThrow('Unsupported platform: unsupported');
    });
  });

  describe('verifyAccountPermissions', () => {
    test('should verify account permissions successfully', async () => {
      const userId = 'user123';
      const platform = 'instagram';
      const accountId = 'account123';

      const mockAccount = {
        platform: platform,
        accountId: accountId,
        accessToken: 'encrypted_token',
        isActive: true,
        tokenExpiresAt: new Date(Date.now() + 3600000)
      };

      const mockUser = {
        connectedAccounts: [mockAccount],
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock the getPlatformClient method
      const mockClient = {
        verifyToken: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 'account123', username: 'test_user' }
        })
      };

      User.findById.mockResolvedValue(mockUser);
      oauthService.decryptToken.mockReturnValue('decrypted_token');

      // Mock the getPlatformClient method by temporarily replacing it
      const originalGetPlatformClient = connectedAccountService.getPlatformClient;
      connectedAccountService.getPlatformClient = jest.fn().mockResolvedValue(mockClient);

      const result = await connectedAccountService.verifyAccountPermissions(userId, platform, accountId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'account123', username: 'test_user' });
      expect(mockUser.save).toHaveBeenCalled();

      // Restore original method
      connectedAccountService.getPlatformClient = originalGetPlatformClient;
    });
  });
});