const openaiService = require('../config/openai');
const {
  STYLE_ANALYSIS_PROMPT,
  CONTENT_GENERATION_PROMPT,
  BATCH_GENERATION_PROMPT,
  REVERSE_ENGINEERING_PROMPT
} = require('./promptTemplates');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.defaultModel = 'gpt-4';
    this.maxTokens = 4000;
    this.temperature = 0.7;
  }

  // Helper method to format prompts with variables
  formatPrompt(template, variables) {
    let formattedPrompt = template;
    
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      formattedPrompt = formattedPrompt.replace(
        new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        variables[key] || ''
      );
    });

    return formattedPrompt;
  }

  // Analyze user's content style
  async analyzeStyle(content, options = {}) {
    try {
      const prompt = this.formatPrompt(STYLE_ANALYSIS_PROMPT, {
        content: content
      });

      const requestConfig = {
        model: options.model || this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert social media analyst. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || 0.3, // Lower temperature for analysis
        response_format: { type: 'json_object' },
        estimatedTokens: 2000
      };

      const response = await openaiService.makeRequest(requestConfig);
      const analysisResult = JSON.parse(response.choices[0].message.content);

      logger.info('Style analysis completed', {
        contentLength: content.length,
        tokensUsed: response.usage?.total_tokens
      });

      return {
        success: true,
        data: analysisResult,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Style analysis failed', { error: error.message });
      throw new Error(`Style analysis failed: ${error.message}`);
    }
  }

  // Generate single content piece
  async generateContent(styleProfile, contentParams, options = {}) {
    try {
      const prompt = this.formatPrompt(CONTENT_GENERATION_PROMPT, {
        styleProfile: JSON.stringify(styleProfile),
        platform: contentParams.platform || 'Instagram',
        contentType: contentParams.contentType || 'Reel',
        trends: JSON.stringify(contentParams.trends || []),
        targetLength: contentParams.targetLength || '30-60 seconds',
        additionalContext: contentParams.additionalContext || ''
      });

      const requestConfig = {
        model: options.model || this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert viral content creator. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || this.temperature,
        response_format: { type: 'json_object' },
        estimatedTokens: 3000
      };

      const response = await openaiService.makeRequest(requestConfig);
      const contentResult = JSON.parse(response.choices[0].message.content);

      logger.info('Content generation completed', {
        platform: contentParams.platform,
        tokensUsed: response.usage?.total_tokens
      });

      return {
        success: true,
        data: contentResult,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Content generation failed', { error: error.message });
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  // Generate multiple content pieces in batch
  async batchGenerateContent(styleProfile, contentParams, count = 10, options = {}) {
    try {
      const prompt = this.formatPrompt(BATCH_GENERATION_PROMPT, {
        styleProfile: JSON.stringify(styleProfile),
        platform: contentParams.platform || 'Instagram',
        theme: contentParams.theme || 'General',
        trends: JSON.stringify(contentParams.trends || []),
        count: count
      });

      const requestConfig = {
        model: options.model || this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert viral content strategist. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 4000, // Higher token limit for batch generation
        temperature: options.temperature || 0.8, // Higher temperature for variety
        response_format: { type: 'json_object' },
        estimatedTokens: 4000
      };

      const response = await openaiService.makeRequest(requestConfig);
      const batchResult = JSON.parse(response.choices[0].message.content);

      logger.info('Batch content generation completed', {
        count: count,
        platform: contentParams.platform,
        tokensUsed: response.usage?.total_tokens
      });

      return {
        success: true,
        data: batchResult,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Batch content generation failed', { error: error.message });
      throw new Error(`Batch content generation failed: ${error.message}`);
    }
  }

  // Reverse engineer successful content
  async reverseEngineerContent(content, platform, metrics = {}, options = {}) {
    try {
      const prompt = this.formatPrompt(REVERSE_ENGINEERING_PROMPT, {
        content: content,
        platform: platform,
        metrics: JSON.stringify(metrics)
      });

      const requestConfig = {
        model: options.model || this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyst specializing in viral content breakdown. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature || 0.4, // Lower temperature for analysis
        response_format: { type: 'json_object' },
        estimatedTokens: 3000
      };

      const response = await openaiService.makeRequest(requestConfig);
      const analysisResult = JSON.parse(response.choices[0].message.content);

      logger.info('Content reverse engineering completed', {
        platform: platform,
        tokensUsed: response.usage?.total_tokens
      });

      return {
        success: true,
        data: analysisResult,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Content reverse engineering failed', { error: error.message });
      throw new Error(`Content reverse engineering failed: ${error.message}`);
    }
  }

  // Get current usage statistics
  getUsageStats() {
    return openaiService.getUsageStats();
  }

  // Health check for OpenAI service
  async healthCheck() {
    try {
      const response = await openaiService.makeRequest({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
        estimatedTokens: 20
      });

      return {
        status: 'healthy',
        model: 'gpt-3.5-turbo',
        responseTime: Date.now(),
        usage: response.usage
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
}

module.exports = new AIService();