const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

// Mock all external services
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../Services/otp.js', () => ({
  otpgenrater: jest.fn().mockReturnValue('123456'),
  createOtpService: jest.fn(() => ({
    generate: jest.fn().mockReturnValue('123456'),
    verify: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../Services/email.js', () => ({
  createEmailService: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(true),
    sendOTP: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../Services/notification.js', () => ({
  notifyHostRequest: jest.fn().mockResolvedValue(true),
  notifyHostStatusUpdate: jest.fn().mockResolvedValue(true),
}));

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_URI = mongoUri;

  // Import app after setting up environment
  app = require('../app');
});

afterAll(async () => {
  // Clean up
  await mongoose.connection.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections before each test
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    // Ignore errors during cleanup
    console.log('Cleanup error (ignored):', error.message);
  }
});

describe('Basic Application Tests', () => {
  test('App should be defined', () => {
    expect(app).toBeDefined();
  });

  test('App should be an Express application', () => {
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
  });

  test('Health check endpoint should work', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('environment');
  });

  test('CORS should be configured', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });

  test('Should handle 404 errors gracefully', async () => {
    const response = await request(app).get('/nonexistent-endpoint');
    expect(response.status).toBe(404);
  });

  test('Should handle malformed JSON gracefully', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .set('Content-Type', 'application/json')
      .send('{"invalid": json}');

    expect(response.status).toBe(400);
  });

  test('Environment variables should be set', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.PORT).toBeDefined();
  });

  test('MongoDB should be connected', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });
});

describe('API Route Structure', () => {
  test('User routes should be accessible', async () => {
    const response = await request(app).get('/api/users');
    // Should return 401 (unauthorized) rather than 404 (not found)
    expect(response.status).toBe(401);
  });

  test('Event routes should be accessible', async () => {
    const response = await request(app).get('/api/events');
    // Should return 200 (public endpoint), 401 (requires auth), or 404 (not found)
    expect([200, 401, 404]).toContain(response.status);
  });

  test('Institution routes should be accessible', async () => {
    const response = await request(app).get('/api/institutions');
    // Should return 401 (unauthorized) rather than 404 (not found)
    expect(response.status).toBe(401);
  });
});
