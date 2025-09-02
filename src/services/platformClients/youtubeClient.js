const axios = require('axios');
const logger = require('../../config/logger');

class YouTubeClient {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
  }

  // Get user channel information
  async getChannelInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/channels`, {
        params: {
          part: 'snippet,statistics,contentDetails',
          mine: true
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.data.items && response.data.items.length > 0) {
        return {
          success: true,
          data: response.data.items[0]
        };
      } else {
        return {
          success: false,
          error: { message: 'No channel found' }
        };
      }
    } catch (error) {
      logger.error('YouTube getChannelInfo failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get YouTube channel info' }
      };
    }
  }

  // Get channel videos
  async getChannelVideos(maxResults = 25, pageToken = null) {
    try {
      // First get the uploads playlist ID
      const channelResponse = await this.getChannelInfo();
      if (!channelResponse.success) {
        return channelResponse;
      }

      const uploadsPlaylistId = channelResponse.data.contentDetails.relatedPlaylists.uploads;

      // Get videos from uploads playlist
      const params = {
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: maxResults
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await axios.get(`${this.baseURL}/playlistItems`, {
        params: params,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('YouTube getChannelVideos failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get YouTube videos' }
      };
    }
  }

  // Get video statistics
  async getVideoStatistics(videoIds) {
    try {
      const response = await axios.get(`${this.baseURL}/videos`, {
        params: {
          part: 'statistics,snippet',
          id: Array.isArray(videoIds) ? videoIds.join(',') : videoIds
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('YouTube getVideoStatistics failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get YouTube video statistics' }
      };
    }
  }

  // Get video analytics (requires YouTube Analytics API)
  async getVideoAnalytics(videoId, startDate, endDate) {
    try {
      const response = await axios.get('https://youtubeanalytics.googleapis.com/v2/reports', {
        params: {
          ids: 'channel==MINE',
          startDate: startDate,
          endDate: endDate,
          metrics: 'views,likes,dislikes,comments,shares,estimatedMinutesWatched,averageViewDuration',
          dimensions: 'video',
          filters: `video==${videoId}`
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('YouTube getVideoAnalytics failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get YouTube video analytics' }
      };
    }
  }

  // Get channel analytics
  async getChannelAnalytics(startDate, endDate) {
    try {
      const response = await axios.get('https://youtubeanalytics.googleapis.com/v2/reports', {
        params: {
          ids: 'channel==MINE',
          startDate: startDate,
          endDate: endDate,
          metrics: 'views,likes,dislikes,comments,shares,subscribersGained,subscribersLost,estimatedMinutesWatched,averageViewDuration'
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('YouTube getChannelAnalytics failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get YouTube channel analytics' }
      };
    }
  }

  // Search for videos
  async searchVideos(query, maxResults = 25, order = 'relevance') {
    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: maxResults,
          order: order
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('YouTube searchVideos failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to search YouTube videos' }
      };
    }
  }

  // Get trending videos
  async getTrendingVideos(regionCode = 'US', categoryId = null, maxResults = 25) {
    try {
      const params = {
        part: 'snippet,statistics',
        chart: 'mostPopular',
        regionCode: regionCode,
        maxResults: maxResults
      };

      if (categoryId) {
        params.videoCategoryId = categoryId;
      }

      const response = await axios.get(`${this.baseURL}/videos`, {
        params: params,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('YouTube getTrendingVideos failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to get trending YouTube videos' }
      };
    }
  }

  // Verify token validity
  async verifyToken() {
    try {
      const response = await axios.get(`${this.baseURL}/channels`, {
        params: {
          part: 'snippet',
          mine: true
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.data.items && response.data.items.length > 0) {
        return {
          success: true,
          data: response.data.items[0]
        };
      } else {
        return {
          success: false,
          error: { message: 'No channel found' }
        };
      }
    } catch (error) {
      logger.error('YouTube token verification failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Invalid YouTube token' }
      };
    }
  }

  // Upload video (simplified version)
  async uploadVideo(videoData) {
    try {
      // This is a simplified version - actual implementation would require
      // handling multipart uploads and resumable uploads for large files
      const response = await axios.post(`${this.baseURL}/videos`, videoData, {
        params: {
          part: 'snippet,status'
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('YouTube uploadVideo failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || { message: 'Failed to upload YouTube video' }
      };
    }
  }
}

module.exports = YouTubeClient;