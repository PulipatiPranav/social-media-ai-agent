const axios = require('axios');
const logger = require('../../config/logger');

class TikTokClient {
  constructor(accessToken, openId) {
    this.accessToken = accessToken;
    this.openId = openId;
    this.baseURL = 'https://open-api.tiktok.com';
  }

  // Get user profile information
  async getUserProfile() {
    try {
      const response = await axios.post(`${this.baseURL}/user/info/`, {
        access_token: this.accessToken,
        open_id: this.openId
      });

      if (response.data.error.code === 'ok') {
        return {
          success: true,
          data: response.data.data.user
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      logger.error('TikTok getUserProfile failed:', error.response?.data || error.message);
      return {
        success: false,
        error: { message: 'Failed to get TikTok profile' }
      };
    }
  }

  // Get user videos
  async getUserVideos(cursor = 0, maxCount = 20) {
    try {
      const response = await axios.post(`${this.baseURL}/video/list/`, {
        access_token: this.accessToken,
        open_id: this.openId,
        cursor: cursor,
        max_count: maxCount
      });

      if (response.data.error.code === 'ok') {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      logger.error('TikTok getUserVideos failed:', error.response?.data || error.message);
      return {
        success: false,
        error: { message: 'Failed to get TikTok videos' }
      };
    }
  }

  // Get video details
  async getVideoDetails(videoId) {
    try {
      const response = await axios.post(`${this.baseURL}/video/query/`, {
        access_token: this.accessToken,
        open_id: this.openId,
        video_ids: [videoId]
      });

      if (response.data.error.code === 'ok') {
        return {
          success: true,
          data: response.data.data.videos[0]
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      logger.error('TikTok getVideoDetails failed:', error.response?.data || error.message);
      return {
        success: false,
        error: { message: 'Failed to get TikTok video details' }
      };
    }
  }

  // Verify token validity
  async verifyToken() {
    try {
      const response = await axios.post(`${this.baseURL}/user/info/`, {
        access_token: this.accessToken,
        open_id: this.openId
      });

      if (response.data.error.code === 'ok') {
        return {
          success: true,
          data: response.data.data.user
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      logger.error('TikTok token verification failed:', error.response?.data || error.message);
      return {
        success: false,
        error: { message: 'Invalid TikTok token' }
      };
    }
  }

  // Upload video (requires additional permissions)
  async uploadVideo(videoData) {
    try {
      // This is a simplified version - actual implementation would require
      // handling multipart uploads and additional video processing
      const response = await axios.post(`${this.baseURL}/video/upload/`, {
        access_token: this.accessToken,
        open_id: this.openId,
        ...videoData
      });

      if (response.data.error.code === 'ok') {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      logger.error('TikTok uploadVideo failed:', error.response?.data || error.message);
      return {
        success: false,
        error: { message: 'Failed to upload TikTok video' }
      };
    }
  }

  // Get trending hashtags (if available through API)
  async getTrendingHashtags() {
    try {
      // Note: This endpoint may not be available in all regions or API versions
      const response = await axios.post(`${this.baseURL}/hashtag/trending/`, {
        access_token: this.accessToken
      });

      if (response.data.error.code === 'ok') {
        return {
          success: true,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          error: response.data.error
        };
      }
    } catch (error) {
      logger.error('TikTok getTrendingHashtags failed:', error.response?.data || error.message);
      return {
        success: false,
        error: { message: 'Failed to get trending hashtags' }
      };
    }
  }

  // Get user followers count and other stats
  async getUserStats() {
    try {
      const profileResult = await this.getUserProfile();
      
      if (profileResult.success) {
        const user = profileResult.data;
        return {
          success: true,
          data: {
            followersCount: user.follower_count || 0,
            followingCount: user.following_count || 0,
            likesCount: user.likes_count || 0,
            videoCount: user.video_count || 0,
            displayName: user.display_name,
            username: user.username,
            avatarUrl: user.avatar_url
          }
        };
      } else {
        return profileResult;
      }
    } catch (error) {
      logger.error('TikTok getUserStats failed:', error);
      return {
        success: false,
        error: { message: 'Failed to get TikTok user stats' }
      };
    }
  }
}

module.exports = TikTokClient;