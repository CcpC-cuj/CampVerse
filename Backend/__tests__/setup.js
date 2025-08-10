// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-signing';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASSWORD = 'test-password';
process.env.PORT = '5001';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

// Increase timeout for tests
jest.setTimeout(15000);

// Test utilities
const testUtils = {
  // Helper to create test user data
  createTestUser: (overrides = {}) => ({
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpassword123',
    phone: '+1234567890',
    ...overrides
  }),

  // Helper to create test event data
  createTestEvent: (overrides = {}) => ({
    title: 'Test Event',
    description: 'Test event description',
    startDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    endDate: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    location: 'Test Location',
    maxParticipants: 100,
    ...overrides
  }),

  // Helper to create test institution data
  createTestInstitution: (overrides = {}) => ({
    name: 'Test Institution',
    description: 'Test institution description',
    address: 'Test Address',
    contactEmail: 'institution@test.com',
    ...overrides
  })
};

// Export for use in test files
module.exports = { testUtils };

// Also set as global for backward compatibility
global.testUtils = testUtils; 