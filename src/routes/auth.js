const express = require('express');
const { authLimiter } = require('../middleware/security');
const { validate, sanitize } = require('../middleware/validation');
const { authenticateToken, verifyRefreshToken } = require('../middleware/auth');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  refreshTokenSchema,
  changePasswordSchema
} = require('../validators/userValidators');
const {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  changePassword
} = require('../controllers/authController');

const router = express.Router();

// Apply auth rate limiting to all auth routes
router.use(authLimiter);

// Apply input sanitization to all routes
router.use(sanitize);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  validate(registerSchema),
  register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  validate(loginSchema),
  login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (requires valid refresh token)
 */
router.post('/refresh',
  validate(refreshTokenSchema),
  verifyRefreshToken,
  refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout user from all devices
 * @access  Private
 */
router.post('/logout-all',
  authenticateToken,
  logoutAll
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  authenticateToken,
  getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  validate(updateProfileSchema),
  updateProfile
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password',
  authenticateToken,
  validate(changePasswordSchema),
  changePassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info (alias for /profile)
 * @access  Private
 */
router.get('/me',
  authenticateToken,
  getProfile
);

module.exports = router;