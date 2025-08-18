const express = require('express');
const router = express.Router();

const aiController = require('../controllers/aiController');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { costMonitoring, trackUsage } = require('../middleware/costMonitoring');

const {
  analyzeStyleSchema,
  updateStyleProfileSchema,
  generateContentSchema,
  batchGenerateSchema,
  reverseEngineerSchema,
  getStyleProfilesQuery,
  mongoIdSchema,
  styleProfileParamsSchema
} = require('../validators/aiValidators');

// Apply authentication and cost monitoring to all AI routes
router.use(authenticateToken);
router.use(costMonitoring({
  dailyLimit: 50.00,    // $50 daily limit
  monthlyLimit: 1000.00, // $1000 monthly limit
  warningThreshold: 0.8  // Warn at 80%
}));
router.use(trackUsage);

// Style Analysis Routes
router.post('/analyze-style', 
  validate(analyzeStyleSchema), 
  aiController.analyzeStyle
);

// Style Profile Management Routes
router.get('/style-profiles', 
  validate(getStyleProfilesQuery, 'query'), 
  aiController.getStyleProfiles
);

router.get('/style-profiles/:id', 
  validate(styleProfileParamsSchema, 'params'), 
  aiController.getStyleProfile
);

router.put('/style-profiles/:id', 
  validate(styleProfileParamsSchema, 'params'),
  validate(updateStyleProfileSchema), 
  aiController.updateStyleProfile
);

router.delete('/style-profiles/:id', 
  validate(styleProfileParamsSchema, 'params'), 
  aiController.deleteStyleProfile
);

router.post('/style-profiles/:id/set-default', 
  validate(styleProfileParamsSchema, 'params'), 
  aiController.setDefaultProfile
);

// Content Generation Routes
router.post('/generate-content', 
  validate(generateContentSchema), 
  aiController.generateContent
);

router.post('/batch-generate', 
  validate(batchGenerateSchema), 
  aiController.batchGenerateContent
);

router.post('/reverse-engineer', 
  validate(reverseEngineerSchema), 
  aiController.reverseEngineerContent
);

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const aiService = require('../services/aiService');
    const healthStatus = await aiService.healthCheck();
    
    res.json({
      success: true,
      data: {
        ai: healthStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'AI service health check failed'
      }
    });
  }
});

// Usage statistics endpoint
router.get('/usage', (req, res) => {
  try {
    const aiService = require('../services/aiService');
    const usage = aiService.getUsageStats();
    
    res.json({
      success: true,
      data: {
        usage,
        limits: req.aiUsage || {},
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'USAGE_STATS_FAILED',
        message: 'Failed to retrieve usage statistics'
      }
    });
  }
});

module.exports = router;