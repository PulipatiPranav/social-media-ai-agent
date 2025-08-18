const OpenAI = require('openai');
const logger = require('./logger');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Token usage tracking
    this.tokenUsage = {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalCost: 0
    };

    // Rate limiting configuration
    this.rateLimiter = {
      requestsPerMinute: 60,
      tokensPerMinute: 90000,
      currentRequests: 0,
      currentTokens: 0,
      resetTime: Date.now() + 60000
    };
  }

  // Rate limiting check
  async checkRateLimit(estimatedTokens = 1000) {
    const now = Date.now();
    
    // Reset counters if minute has passed
    if (now >= this.rateLimiter.resetTime) {
      this.rateLimiter.currentRequests = 0;
      this.rateLimiter.currentTokens = 0;
      this.rateLimiter.resetTime = now + 60000;
    }

    // Check if we're within limits
    if (this.rateLimiter.currentRequests >= this.rateLimiter.requestsPerMinute) {
      const waitTime = this.rateLimiter.resetTime - now;
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    if (this.rateLimiter.currentTokens + estimatedTokens > this.rateLimiter.tokensPerMinute) {
      const waitTime = this.rateLimiter.resetTime - now;
      throw new Error(`Token limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    this.rateLimiter.currentRequests++;
    this.rateLimiter.currentTokens += estimatedTokens;
  }

  // Track token usage and costs
  trackUsage(usage) {
    if (!usage) return;

    this.tokenUsage.totalTokens += usage.total_tokens || 0;
    this.tokenUsage.promptTokens += usage.prompt_tokens || 0;
    this.tokenUsage.completionTokens += usage.completion_tokens || 0;

    // Calculate cost (GPT-4 pricing as of 2024)
    const inputCost = (usage.prompt_tokens || 0) * 0.00003; // $0.03 per 1K tokens
    const outputCost = (usage.completion_tokens || 0) * 0.00006; // $0.06 per 1K tokens
    const requestCost = inputCost + outputCost;
    
    this.tokenUsage.totalCost += requestCost;

    logger.info('OpenAI Usage', {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      cost: requestCost.toFixed(6)
    });
  }

  // Get current usage statistics
  getUsageStats() {
    return {
      ...this.tokenUsage,
      totalCost: parseFloat(this.tokenUsage.totalCost.toFixed(6))
    };
  }

  // Make API call with error handling and usage tracking
  async makeRequest(requestConfig) {
    try {
      await this.checkRateLimit(requestConfig.estimatedTokens);

      const response = await this.client.chat.completions.create(requestConfig);
      
      // Track usage
      this.trackUsage(response.usage);

      return response;
    } catch (error) {
      logger.error('OpenAI API Error', {
        error: error.message,
        requestConfig: {
          model: requestConfig.model,
          messageCount: requestConfig.messages?.length
        }
      });

      // Handle specific OpenAI errors
      if (error.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      } else if (error.status === 401) {
        throw new Error('Invalid OpenAI API key.');
      } else if (error.status === 400) {
        throw new Error('Invalid request to OpenAI API.');
      } else if (error.status >= 500) {
        throw new Error('OpenAI service temporarily unavailable.');
      }

      throw error;
    }
  }
}

// Create singleton instance
const openaiService = new OpenAIService();

module.exports = openaiService;