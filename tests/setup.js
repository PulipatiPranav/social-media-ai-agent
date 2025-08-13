// Test setup file
const mongoose = require('mongoose');

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