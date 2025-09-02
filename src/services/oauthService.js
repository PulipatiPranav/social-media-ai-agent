const crypto = require('crypto');
const axios = require('axios');
const logger = require('../config/logger');

class OAuthService {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY;
    if (!this.encryptionKey || this.encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
  }

  // Encrypt sensitive tokens before storing
  encryptToken(token) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      let encrypted = cipher.update(token, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  // Decrypt tokens when retrieving
  decryptToken(encryptedToken) {
    try {
      const parts = encryptedToken.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Token decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  // Generate OAuth authorization URL for Instagram
  getInstagramAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
      scope: 'user_profile,user_media',
      response_type: 'code',
      state: state
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  // Generate OAuth authorization URL for TikTok
  getTikTokAuthUrl(state) {
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      redirect_uri: process.env.TIKTOK_REDIRECT_URI,
      scope: 'user.info.basic,video.list',
      response_type: 'code',
      state: state
    });

    return `https://www.tiktok.com/auth/authorize/?${params.toString()}`;
  }

  // Generate OAuth authorization URL for YouTube
  getYouTubeAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID,
      redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
      scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      state: state
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  // Exchange authorization code for access token - Instagram
  async exchangeInstagramCode(code) {
    try {
      const response = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
        code: code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, user_id } = response.data;

      // Get user profile information
      const profileResponse = await axios.get(`https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`);
      
      return {
        accessToken: access_token,
        accountId: user_id,
        username: profileResponse.data.username,
        permissions: ['user_profile', 'user_media']
      };
    } catch (error) {
      logger.error('Instagram token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange Instagram authorization code');
    }
  }

  // Exchange authorization code for access token - TikTok
  async exchangeTikTokCode(code) {
    try {
      const response = await axios.post('https://open-api.tiktok.com/oauth/access_token/', {
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.TIKTOK_REDIRECT_URI
      });

      const { access_token, refresh_token, expires_in, open_id } = response.data.data;

      // Get user profile information
      const profileResponse = await axios.post('https://open-api.tiktok.com/user/info/', {
        access_token: access_token,
        open_id: open_id
      });

      const userInfo = profileResponse.data.data.user;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        accountId: open_id,
        username: userInfo.display_name,
        permissions: ['user.info.basic', 'video.list'],
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };
    } catch (error) {
      logger.error('TikTok token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange TikTok authorization code');
    }
  }

  // Exchange authorization code for access token - YouTube
  async exchangeYouTubeCode(code) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.YOUTUBE_REDIRECT_URI
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Get user profile information
      const profileResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });

      const channel = profileResponse.data.items[0];

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        accountId: channel.id,
        username: channel.snippet.title,
        permissions: ['youtube.readonly', 'youtube.upload'],
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };
    } catch (error) {
      logger.error('YouTube token exchange failed:', error.response?.data || error.message);
      throw new Error('Failed to exchange YouTube authorization code');
    }
  }

  // Refresh access token - Instagram (Instagram doesn't support refresh tokens)
  async refreshInstagramToken(refreshToken) {
    throw new Error('Instagram does not support token refresh. User must re-authenticate.');
  }

  // Refresh access token - TikTok
  async refreshTikTokToken(refreshToken) {
    try {
      const response = await axios.post('https://open-api.tiktok.com/oauth/refresh_token/', {
        client_key: process.env.TIKTOK_CLIENT_KEY,
        client_secret: process.env.TIKTOK_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const { access_token, refresh_token, expires_in } = response.data.data;

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };
    } catch (error) {
      logger.error('TikTok token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh TikTok token');
    }
  }

  // Refresh access token - YouTube
  async refreshYouTubeToken(refreshToken) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.YOUTUBE_CLIENT_ID,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const { access_token, expires_in } = response.data;

      return {
        accessToken: access_token,
        expiresAt: new Date(Date.now() + expires_in * 1000)
      };
    } catch (error) {
      logger.error('YouTube token refresh failed:', error.response?.data || error.message);
      throw new Error('Failed to refresh YouTube token');
    }
  }

  // Verify account permissions - Instagram
  async verifyInstagramAccount(accessToken) {
    try {
      const response = await axios.get(`https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`);
      
      return {
        isValid: true,
        accountInfo: response.data,
        permissions: ['user_profile', 'user_media']
      };
    } catch (error) {
      logger.error('Instagram account verification failed:', error.response?.data || error.message);
      return {
        isValid: false,
        error: 'Invalid or expired Instagram token'
      };
    }
  }

  // Verify account permissions - TikTok
  async verifyTikTokAccount(accessToken, openId) {
    try {
      const response = await axios.post('https://open-api.tiktok.com/user/info/', {
        access_token: accessToken,
        open_id: openId
      });

      if (response.data.error.code === 'ok') {
        return {
          isValid: true,
          accountInfo: response.data.data.user,
          permissions: ['user.info.basic', 'video.list']
        };
      } else {
        return {
          isValid: false,
          error: response.data.error.message
        };
      }
    } catch (error) {
      logger.error('TikTok account verification failed:', error.response?.data || error.message);
      return {
        isValid: false,
        error: 'Invalid or expired TikTok token'
      };
    }
  }

  // Verify account permissions - YouTube
  async verifyYouTubeAccount(accessToken) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.data.items && response.data.items.length > 0) {
        return {
          isValid: true,
          accountInfo: response.data.items[0],
          permissions: ['youtube.readonly', 'youtube.upload']
        };
      } else {
        return {
          isValid: false,
          error: 'No YouTube channel found for this account'
        };
      }
    } catch (error) {
      logger.error('YouTube account verification failed:', error.response?.data || error.message);
      return {
        isValid: false,
        error: 'Invalid or expired YouTube token'
      };
    }
  }

  // Generate secure state parameter for OAuth
  generateState(userId, platform) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const stateData = `${userId}:${platform}:${timestamp}:${randomBytes}`;
    return Buffer.from(stateData).toString('base64');
  }

  // Verify and parse state parameter
  verifyState(state, expectedUserId, expectedPlatform) {
    try {
      const stateData = Buffer.from(state, 'base64').toString('utf8');
      const [userId, platform, timestamp, randomBytes] = stateData.split(':');
      
      // Verify user ID and platform match
      if (userId !== expectedUserId || platform !== expectedPlatform) {
        return { isValid: false, error: 'State parameter mismatch' };
      }

      // Verify timestamp is not too old (10 minutes)
      const stateAge = Date.now() - parseInt(timestamp);
      if (stateAge > 10 * 60 * 1000) {
        return { isValid: false, error: 'State parameter expired' };
      }

      return { isValid: true };
    } catch (error) {
      logger.error('State verification failed:', error);
      return { isValid: false, error: 'Invalid state parameter' };
    }
  }
}

module.exports = new OAuthService();