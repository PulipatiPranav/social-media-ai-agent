// Test setup file
const mongoose = require('mongoose');

// Set up test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.OPENAI_API_KEY = 'test-openai-key-sk-1234567890abcdef';
process.env.ENCRYPTION_KEY = '12345678901234567890123456789012'; // 32 characters for OAuth token encryption

// OAuth Configuration for tests
process.env.INSTAGRAM_CLIENT_ID = 'test_instagram_client_id';
process.env.INSTAGRAM_CLIENT_SECRET = 'test_instagram_client_secret';
process.env.INSTAGRAM_REDIRECT_URI = 'http://localhost:3000/api/social/callback/instagram';
process.env.TIKTOK_CLIENT_KEY = 'test_tiktok_client_key';
process.env.TIKTOK_CLIENT_SECRET = 'test_tiktok_client_secret';
process.env.TIKTOK_REDIRECT_URI = 'http://localhost:3000/api/social/callback/tiktok';
process.env.YOUTUBE_CLIENT_ID = 'test_youtube_client_id';
process.env.YOUTUBE_CLIENT_SECRET = 'test_youtube_client_secret';
process.env.YOUTUBE_REDIRECT_URI = 'http://localhost:3000/api/social/callback/youtube';

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock logger to avoid console output during tests
jest.mock('../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  http: jest.fn()
}));

// Setup test database connection
beforeAll(async () => {
  // Use in-memory database for testing
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = new MongoMemoryServer();
  await mongod.start();
  const uri = mongod.getUri();
  
  // Store reference globally for teardown
  global.__MONGOD__ = mongod;
  
  await mongoose.connect(uri);
});

// Clean up after tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    global.__MONGOD__ = null;
  }
});

// Clear all collections before each test
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});