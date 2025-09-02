const User = require('../models/User');
const oauthService = require('./oauthService');
const InstagramClient = require('./platformClients/instagramClient');
const TikTokClient = require('./platformClients/tiktokClient');
const YouTubeClient = require('./platformClients/youtubeClient');
const logger = require('../config/logger');

class ConnectedAccountService {
  // Add or update a connected account
  async addConnectedAccount(userId, platform, accountData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Encrypt sensitive tokens
      const encryptedAccessToken = oauthService.encryptToken(accountData.accessToken);
      const encryptedRefreshToken = accountData.refreshToken ? 
        oauthService.encryptToken(accountData.refreshToken) : null;

      // Check if account already exists
      const existingAccountIndex = user.connectedAccounts.findIndex(
        account => account.platform === platform && account.accountId === accountData.accountId
      );

      const accountInfo = {
        platform: platform,
        accountId: accountData.accountId,
        username: accountData.username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: accountData.expiresAt,
        permissions: accountData.permissions || [],
        isActive: true,
        lastSyncAt: new Date()
      };

      if (existingAccountIndex >= 0) {
        // Update existing account
        user.connectedAccounts[existingAccountIndex] = {
          ...user.connectedAccounts[existingAccountIndex].toObject(),
          ...accountInfo,
          updatedAt: new Date()
        };
        logger.info(`Updated existing ${platform} account for user ${userId}`);
      } else {
        // Add new account
        user.connectedAccounts.push(accountInfo);
        logger.info(`Added new ${platform} account for user ${userId}`);
      }

      await user.save();

      // Return account info without sensitive data
      const { accessToken, refreshToken, ...safeAccountInfo } = accountInfo;
      return {
        success: true,
        data: safeAccountInfo
      };
    } catch (error) {
      logger.error('Error adding connected account:', error);
      throw error;
    }
  }

  // Get connected accounts for a user
  async getConnectedAccounts(userId, platform = null) {
    try {
      const user = await User.findById(userId).select('connectedAccounts');
      if (!user) {
        throw new Error('User not found');
      }

      let accounts = user.connectedAccounts.filter(account => account.isActive);
      
      if (platform) {
        accounts = accounts.filter(account => account.platform === platform);
      }

      // Remove sensitive data
      const safeAccounts = accounts.map(account => {
        const { accessToken, refreshToken, ...safeAccount } = account.toObject();
        return safeAccount;
      });

      return {
        success: true,
        data: safeAccounts
      };
    } catch (error) {
      logger.error('Error getting connected accounts:', error);
      throw error;
    }
  }

  // Remove a connected account
  async removeConnectedAccount(userId, platform, accountId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const accountIndex = user.connectedAccounts.findIndex(
        account => account.platform === platform && account.accountId === accountId
      );

      if (accountIndex === -1) {
        throw new Error('Connected account not found');
      }

      user.connectedAccounts[accountIndex].isActive = false;
      await user.save();

      logger.info(`Removed ${platform} account ${accountId} for user ${userId}`);

      return {
        success: true,
        message: 'Account disconnected successfully'
      };
    } catch (error) {
      logger.error('Error removing connected account:', error);
      throw error;
    }
  }

  // Get platform client for a connected account
  async getPlatformClient(userId, platform, accountId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      let account;
      if (accountId) {
        account = user.connectedAccounts.find(
          acc => acc.platform === platform && acc.accountId === accountId && acc.isActive
        );
      } else {
        // Get the first active account for the platform
        account = user.connectedAccounts.find(
          acc => acc.platform === platform && acc.isActive
        );
      }

      if (!account) {
        throw new Error(`No active ${platform} account found`);
      }

      // Check if token needs refresh
      if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
        logger.info(`Token expired for ${platform} account ${account.accountId}, attempting refresh`);
        
        const refreshResult = await this.refreshAccountToken(userId, platform, account.accountId);
        if (!refreshResult.success) {
          throw new Error(`Failed to refresh ${platform} token: ${refreshResult.error}`);
        }
        
        // Get updated account info
        const updatedUser = await User.findById(userId);
        account = updatedUser.connectedAccounts.find(
          acc => acc.platform === platform && acc.accountId === account.accountId && acc.isActive
        );
      }

      // Decrypt access token
      const accessToken = oauthService.decryptToken(account.accessToken);

      // Create platform-specific client
      switch (platform) {
        case 'instagram':
          return new InstagramClient(accessToken);
        case 'tiktok':
          return new TikTokClient(accessToken, account.accountId);
        case 'youtube':
          return new YouTubeClient(accessToken);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      logger.error('Error getting platform client:', error);
      throw error;
    }
  }

  // Refresh account token
  async refreshAccountToken(userId, platform, accountId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const accountIndex = user.connectedAccounts.findIndex(
        account => account.platform === platform && account.accountId === accountId && account.isActive
      );

      if (accountIndex === -1) {
        throw new Error('Connected account not found');
      }

      const account = user.connectedAccounts[accountIndex];
      
      if (!account.refreshToken) {
        throw new Error(`${platform} does not support token refresh`);
      }

      // Decrypt refresh token
      const refreshToken = oauthService.decryptToken(account.refreshToken);

      // Refresh token based on platform
      let refreshResult;
      switch (platform) {
        case 'tiktok':
          refreshResult = await oauthService.refreshTikTokToken(refreshToken);
          break;
        case 'youtube':
          refreshResult = await oauthService.refreshYouTubeToken(refreshToken);
          break;
        case 'instagram':
          throw new Error('Instagram does not support token refresh');
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }

      // Update account with new tokens
      user.connectedAccounts[accountIndex].accessToken = oauthService.encryptToken(refreshResult.accessToken);
      if (refreshResult.refreshToken) {
        user.connectedAccounts[accountIndex].refreshToken = oauthService.encryptToken(refreshResult.refreshToken);
      }
      user.connectedAccounts[accountIndex].tokenExpiresAt = refreshResult.expiresAt;
      user.connectedAccounts[accountIndex].lastSyncAt = new Date();

      await user.save();

      logger.info(`Successfully refreshed ${platform} token for user ${userId}`);

      return {
        success: true,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      logger.error('Error refreshing account token:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify account permissions
  async verifyAccountPermissions(userId, platform, accountId) {
    try {
      const client = await this.getPlatformClient(userId, platform, accountId);
      const verificationResult = await client.verifyToken();

      if (verificationResult.success) {
        // Update last sync time
        const user = await User.findById(userId);
        const accountIndex = user.connectedAccounts.findIndex(
          account => account.platform === platform && account.accountId === accountId && account.isActive
        );

        if (accountIndex >= 0) {
          user.connectedAccounts[accountIndex].lastSyncAt = new Date();
          await user.save();
        }

        return {
          success: true,
          data: verificationResult.data,
          message: 'Account verification successful'
        };
      } else {
        return {
          success: false,
          error: verificationResult.error
        };
      }
    } catch (error) {
      logger.error('Error verifying account permissions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get account analytics data
  async getAccountAnalytics(userId, platform, accountId, options = {}) {
    try {
      const client = await this.getPlatformClient(userId, platform, accountId);
      
      let analyticsData;
      switch (platform) {
        case 'instagram':
          if (options.mediaId) {
            analyticsData = await client.getMediaInsights(options.mediaId);
          } else {
            analyticsData = await client.getAccountInsights(
              options.period || 'day',
              options.since,
              options.until
            );
          }
          break;
        case 'tiktok':
          analyticsData = await client.getUserStats();
          break;
        case 'youtube':
          if (options.videoId) {
            analyticsData = await client.getVideoAnalytics(
              options.videoId,
              options.startDate,
              options.endDate
            );
          } else {
            analyticsData = await client.getChannelAnalytics(
              options.startDate,
              options.endDate
            );
          }
          break;
        default:
          throw new Error(`Analytics not supported for platform: ${platform}`);
      }

      return analyticsData;
    } catch (error) {
      logger.error('Error getting account analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sync account data
  async syncAccountData(userId, platform, accountId) {
    try {
      const client = await this.getPlatformClient(userId, platform, accountId);
      
      // Get basic profile information
      let profileData;
      switch (platform) {
        case 'instagram':
          profileData = await client.getUserProfile();
          break;
        case 'tiktok':
          profileData = await client.getUserProfile();
          break;
        case 'youtube':
          profileData = await client.getChannelInfo();
          break;
        default:
          throw new Error(`Sync not supported for platform: ${platform}`);
      }

      if (profileData.success) {
        // Update user's connected account with latest data
        const user = await User.findById(userId);
        const accountIndex = user.connectedAccounts.findIndex(
          account => account.platform === platform && account.accountId === accountId && account.isActive
        );

        if (accountIndex >= 0) {
          user.connectedAccounts[accountIndex].lastSyncAt = new Date();
          // Update username if it changed
          if (profileData.data.username || profileData.data.title) {
            user.connectedAccounts[accountIndex].username = profileData.data.username || profileData.data.title;
          }
          await user.save();
        }

        return {
          success: true,
          data: profileData.data,
          message: 'Account data synced successfully'
        };
      } else {
        return profileData;
      }
    } catch (error) {
      logger.error('Error syncing account data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ConnectedAccountService();