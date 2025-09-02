const axios = require('axios');
const logger = require('../../config/logger');

class InstagramClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://graph.instagram.com';
  }

  // Get user profile information
  async getUserProfile() {
    try {
      const response = await axios.get(`${this.baseURL}/me`, {
        params: {
          fields: 'id,username,account_type,media_count,followers_count',
          access_token: this.accessToken
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Instagram getUserProfile failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get Instagram profile' }
      };
    }
  }

  // Get user media
  async getUserMedia(limit = 25) {
    try {
      const response = await axios.get(`${this.baseURL}/me/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit: limit,
          access_token: this.accessToken
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Instagram getUserMedia failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get Instagram media' }
      };
    }
  }

  // Get media insights (requires business account)
  async getMediaInsights(mediaId) {
    try {
      const response = await axios.get(`${this.baseURL}/${mediaId}/insights`, {
        params: {
          metric: 'impressions,reach,likes,comments,saves,shares',
          access_token: this.accessToken
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Instagram getMediaInsights failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get Instagram insights' }
      };
    }
  }

  // Get account insights (requires business account)
  async getAccountInsights(period = 'day', since, until) {
    try {
      const params = {
        metric: 'impressions,reach,profile_views,website_clicks',
        period: period,
        access_token: this.accessToken
      };

      if (since) params.since = since;
      if (until) params.until = until;

      const response = await axios.get(`${this.baseURL}/me/insights`, {
        params: params
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Instagram getAccountInsights failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get Instagram account insights' }
      };
    }
  }

  // Verify token validity
  async verifyToken() {
    try {
      const response = await axios.get(`${this.baseURL}/me`, {
        params: {
          fields: 'id,username',
          access_token: this.accessToken
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Instagram token verification failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Invalid Instagram token' }
      };
    }
  }

  // Get hashtag information
  async getHashtagInfo(hashtag) {
    try {
      // First get hashtag ID
      const searchResponse = await axios.get(`${this.baseURL}/ig_hashtag_search`, {
        params: {
          user_id: 'me',
          q: hashtag,
          access_token: this.accessToken
        }
      });

      if (!searchResponse.data.data || searchResponse.data.data.length === 0) {
        return {
          success: false,
          error: { message: 'Hashtag not found' }
        };
      }

      const hashtagId = searchResponse.data.data[0].id;

      // Get hashtag details
      const response = await axios.get(`${this.baseURL}/${hashtagId}`, {
        params: {
          fields: 'id,name,media_count',
          access_token: this.accessToken
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Instagram getHashtagInfo failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get hashtag information' }
      };
    }
  }
}

module.exports = InstagramClient;