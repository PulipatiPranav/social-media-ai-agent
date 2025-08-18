// Token estimation utilities for OpenAI API calls
// These are rough estimates based on OpenAI's tokenization patterns

class TokenEstimator {
  // Rough estimation: 1 token ≈ 4 characters for English text
  static estimateTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    
    // Basic estimation
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    
    // More accurate estimation considering:
    // - Average English word is ~4.7 characters
    // - Punctuation and special characters
    // - OpenAI's tokenization patterns
    const estimatedTokens = Math.ceil(charCount / 4);
    
    return Math.max(estimatedTokens, Math.ceil(wordCount * 1.3));
  }

  // Estimate tokens for a complete chat completion request
  static estimateRequestTokens(messages, model = 'gpt-4') {
    let totalTokens = 0;
    
    // Base tokens for the request structure
    totalTokens += 10; // Base overhead
    
    // Tokens for each message
    messages.forEach(message => {
      totalTokens += 4; // Message overhead
      totalTokens += this.estimateTokens(message.role);
      totalTokens += this.estimateTokens(message.content);
    });
    
    // Model-specific adjustments
    if (model.includes('gpt-4')) {
      totalTokens = Math.ceil(totalTokens * 1.1); // GPT-4 tends to use slightly more tokens
    }
    
    return totalTokens;
  }

  // Estimate response tokens based on max_tokens parameter
  static estimateResponseTokens(maxTokens, temperature = 0.7) {
    // Higher temperature tends to produce longer responses
    const temperatureMultiplier = 0.7 + (temperature * 0.3);
    return Math.ceil(maxTokens * temperatureMultiplier);
  }

  // Estimate total tokens for a complete request/response cycle
  static estimateCompleteRequestTokens(messages, maxTokens = 1000, model = 'gpt-4', temperature = 0.7) {
    const requestTokens = this.estimateRequestTokens(messages, model);
    const responseTokens = this.estimateResponseTokens(maxTokens, temperature);
    
    return {
      requestTokens,
      responseTokens,
      totalTokens: requestTokens + responseTokens
    };
  }

  // Calculate estimated cost based on token usage
  static estimateCost(promptTokens, completionTokens, model = 'gpt-4') {
    let inputRate, outputRate;
    
    // Pricing as of 2024 (per 1K tokens)
    switch (model) {
      case 'gpt-4':
      case 'gpt-4-0613':
        inputRate = 0.03;
        outputRate = 0.06;
        break;
      case 'gpt-4-turbo':
      case 'gpt-4-turbo-preview':
        inputRate = 0.01;
        outputRate = 0.03;
        break;
      case 'gpt-3.5-turbo':
      case 'gpt-3.5-turbo-0613':
        inputRate = 0.0015;
        outputRate = 0.002;
        break;
      default:
        inputRate = 0.03; // Default to GPT-4 pricing
        outputRate = 0.06;
    }
    
    const inputCost = (promptTokens / 1000) * inputRate;
    const outputCost = (completionTokens / 1000) * outputRate;
    
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  // Check if request is within token limits
  static validateTokenLimits(messages, maxTokens, model = 'gpt-4') {
    const modelLimits = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384
    };
    
    const modelLimit = modelLimits[model] || 8192;
    const requestTokens = this.estimateRequestTokens(messages, model);
    const totalEstimated = requestTokens + maxTokens;
    
    if (totalEstimated > modelLimit) {
      return {
        valid: false,
        error: `Estimated tokens (${totalEstimated}) exceed model limit (${modelLimit})`,
        requestTokens,
        maxTokens,
        modelLimit
      };
    }
    
    return {
      valid: true,
      requestTokens,
      maxTokens,
      totalEstimated,
      modelLimit
    };
  }

  // Truncate text to fit within token limits
  static truncateToTokenLimit(text, maxTokens) {
    const estimatedTokens = this.estimateTokens(text);
    
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    // Rough truncation based on character count
    const ratio = maxTokens / estimatedTokens;
    const targetLength = Math.floor(text.length * ratio * 0.9); // 10% buffer
    
    return text.substring(0, targetLength) + '...';
  }
}

module.exports = TokenEstimator;