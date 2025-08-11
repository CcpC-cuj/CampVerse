const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true)
  }))
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
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    try {
      await collections[key].deleteMany({});
    } catch (e) {
      // ignore
    }
  }
});

describe('Application Setup', () => {
  test('App should be defined', () => {
    expect(app).toBeDefined();
  });

  test('App should be an Express application', () => {
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
    expect(typeof app.post).toBe('function');
  });
});

describe('Health Check Endpoint', () => {
  test('GET /health should return 200 and health status', async () => {
    const response = await request(app).get('/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('environment');
    expect(response.body.environment).toBe('test');
  });

  test('Health check should include valid timestamp', async () => {
    const response = await request(app).get('/health');
    const timestamp = new Date(response.body.timestamp);
    
    expect(timestamp.getTime()).toBeGreaterThan(0);
    expect(timestamp).toBeInstanceOf(Date);
  });

  test('Health check should include uptime', async () => {
    const response = await request(app).get('/health');
    
    expect(response.body.uptime).toBeGreaterThan(0);
    expect(typeof response.body.uptime).toBe('number');
  });
});

describe('API Routes', () => {
  test('GET /api/users should return 404 for undefined routes', async () => {
    const response = await request(app).get('/api/users/nonexistent');
    expect(response.status).toBe(404);
  });

  test('GET /api/events should return 404 for undefined routes', async () => {
    const response = await request(app).get('/api/events/nonexistent');
    expect(response.status).toBe(404);
  });

  test('GET /api/institutions should return 404 for undefined routes', async () => {
    const response = await request(app).get('/api/institutions/nonexistent');
    expect(response.status).toBe(404);
  });
});

describe('CORS Configuration', () => {
  test('Should include CORS headers', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:3000');
    
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });
});

describe('Error Handling', () => {
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
});

describe('Environment Variables', () => {
  test('Should have required environment variables set', () => {
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.PORT).toBeDefined();
  });
});

describe('Database Connection', () => {
  test('MongoDB should be connected', () => {
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });
}); 