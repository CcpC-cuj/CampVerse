// Test environment setup
require('dotenv').config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Use environment variables with fallbacks for testing
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jwt-signing';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'test@example.com';
process.env.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'test-password';
process.env.PORT = process.env.PORT || '5002'; // Use different port for tests
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.ML_API_KEY = process.env.ML_API_KEY || 'test-ml-api-key';
process.env.ML_CERTIFICATE_API_URL = process.env.ML_CERTIFICATE_API_URL || 'https://test-ml-api.example.com';
process.env.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'firebase';
process.env.FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'test-bucket.appspot.com';

// Increase timeout for tests
jest.setTimeout(30000);

// Global test cleanup
afterAll(async () => {
  // Close any open handles
  if (global.gc) {
    global.gc();
  }
});

// Test utilities
const testUtils = {
  // Helper to create test user data
  createTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!', // Strong password for testing
    phone: '+1234567890',
    ...overrides,
  }),

  // Helper to create test event data
  createTestEvent: (overrides = {}) => ({
    title: 'Test Event',
    description: 'Test event description',
    startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    location: {
      type: 'physical',
      address: 'Test Location',
      coordinates: { lat: 0, lng: 0 }
    },
    bannerURL: 'https://example.com/banner.jpg',
    date: new Date(Date.now() + 86400000).toISOString(),
    hostUserId: 'test-host-id',
    maxParticipants: 100,
    ...overrides,
  }),

  // Helper to create test institution data
  createTestInstitution: (overrides = {}) => ({
    name: 'Test Institution',
    description: 'Test institution description',
    address: 'Test Address',
    contactEmail: 'institution@test.com',
    ...overrides,
  }),
};

// Export for use in test files
module.exports = { testUtils };

// Also set as global for backward compatibility
global.testUtils = testUtils;
