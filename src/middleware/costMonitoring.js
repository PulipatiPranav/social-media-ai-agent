const logger = require('../config/logger');
const aiService = require('../services/aiService');

// Cost monitoring middleware
const costMonitoring = (options = {}) => {
  const {
    dailyLimit = 50.00, // $50 daily limit
    monthlyLimit = 1000.00, // $1000 monthly limit
    warningThreshold = 0.8 // Warn at 80% of limit
  } = options;

  // In-memory storage for demo (in production, use Redis or database)
  let dailyCost = 0;
  let monthlyCost = 0;
  let lastResetDate = new Date().toDateString();
  let lastResetMonth = new Date().getMonth();

  return (req, res, next) => {
    // Reset daily cost if new day
    const currentDate = new Date().toDateString();
    if (currentDate !== lastResetDate) {
      dailyCost = 0;
      lastResetDate = currentDate;
    }

    // Reset monthly cost if new month
    const currentMonth = new Date().getMonth();
    if (currentMonth !== lastResetMonth) {
      monthlyCost = 0;
      lastResetMonth = currentMonth;
    }

    // Check current usage
    const currentUsage = aiService.getUsageStats();
    
    // Update costs (this is a simplified approach)
    dailyCost = currentUsage.totalCost;
    monthlyCost = currentUsage.totalCost;

    // Check limits
    if (dailyCost >= dailyLimit) {
      logger.error('Daily cost limit exceeded', {
        dailyCost,
        dailyLimit,
        userId: req.user?.id
      });
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'DAILY_COST_LIMIT_EXCEEDED',
          message: 'Daily AI usage cost limit exceeded. Please try again tomorrow.',
          details: {
            dailyCost: dailyCost.toFixed(2),
            dailyLimit: dailyLimit.toFixed(2)
          }
        }
      });
    }

    if (monthlyCost >= monthlyLimit) {
      logger.error('Monthly cost limit exceeded', {
        monthlyCost,
        monthlyLimit,
        userId: req.user?.id
      });
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'MONTHLY_COST_LIMIT_EXCEEDED',
          message: 'Monthly AI usage cost limit exceeded. Please upgrade your plan.',
          details: {
            monthlyCost: monthlyCost.toFixed(2),
            monthlyLimit: monthlyLimit.toFixed(2)
          }
        }
      });
    }

    // Warning thresholds
    if (dailyCost >= dailyLimit * warningThreshold) {
      logger.warn('Daily cost warning threshold reached', {
        dailyCost,
        threshold: dailyLimit * warningThreshold,
        userId: req.user?.id
      });
    }

    if (monthlyCost >= monthlyLimit * warningThreshold) {
      logger.warn('Monthly cost warning threshold reached', {
        monthlyCost,
        threshold: monthlyLimit * warningThreshold,
        userId: req.user?.id
      });
    }

    // Add usage info to request
    req.aiUsage = {
      dailyCost,
      monthlyCost,
      dailyLimit,
      monthlyLimit,
      dailyRemaining: dailyLimit - dailyCost,
      monthlyRemaining: monthlyLimit - monthlyCost
    };

    next();
  };
};

// Usage tracking middleware (to be called after AI operations)
const trackUsage = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the AI usage for this request
    if (req.aiUsage && res.locals.aiUsage) {
      logger.info('AI request completed', {
        userId: req.user?.id,
        endpoint: req.path,
        tokensUsed: res.locals.aiUsage.tokensUsed,
        cost: res.locals.aiUsage.cost,
        dailyTotal: req.aiUsage.dailyCost,
        monthlyTotal: req.aiUsage.monthlyCost
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  costMonitoring,
  trackUsage
};