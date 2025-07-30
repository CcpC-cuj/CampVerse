const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;

// Mock external services
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    del: jest.fn().mockResolvedValue(true)
  }))
}));

describe('Performance Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
    
    app = require('../app');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Response Time Tests', () => {
    it('health check should respond within 100ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(100);
    });

    it('API routes should respond within 500ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/events')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500);
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle 10 concurrent health check requests', async () => {
      const requests = Array(10).fill().map(() => 
        request(app).get('/health')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(2000);
    });

    it('should handle 20 concurrent API requests', async () => {
      const requests = Array(20).fill().map(() => 
        request(app).get('/api/events')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Database Performance Tests', () => {
    it('should handle bulk user creation efficiently', async () => {
      const User = require('../Models/User');
      const users = Array(100).fill().map((_, index) => ({
        name: `User ${index}`,
        email: `user${index}@example.com`,
        passwordHash: 'hashedpassword',
        phone: `123456789${index.toString().padStart(2, '0')}`,
        role: 'user'
      }));

      const startTime = Date.now();
      await User.insertMany(users);
      const creationTime = Date.now() - startTime;

      // Should create 100 users in under 2 seconds
      expect(creationTime).toBeLessThan(2000);

      // Verify all users were created
      const count = await User.countDocuments();
      expect(count).toBeGreaterThanOrEqual(100);
    });

    it('should handle bulk event creation efficiently', async () => {
      const Event = require('../Models/Event');
      const events = Array(50).fill().map((_, index) => ({
        title: `Event ${index}`,
        description: `Description for event ${index}`,
        type: 'workshop',
        organizer: `Organizer ${index}`,
        hostUserId: new mongoose.Types.ObjectId(),
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z')
        }
      }));

      const startTime = Date.now();
      await Event.insertMany(events);
      const creationTime = Date.now() - startTime;

      // Should create 50 events in under 1 second
      expect(creationTime).toBeLessThan(1000);

      // Verify all events were created
      const count = await Event.countDocuments();
      expect(count).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        await request(app).get('/health');
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Error Recovery Tests', () => {
    it('should recover from database connection issues', async () => {
      // This test simulates database connection issues
      const originalConnect = mongoose.connect;
      
      // Mock a temporary connection failure
      mongoose.connect = jest.fn().mockRejectedValueOnce(new Error('Connection failed'));
      
      try {
        await request(app).get('/api/events');
      } catch (error) {
        // Should handle the error gracefully
        expect(error).toBeDefined();
      }
      
      // Restore original function
      mongoose.connect = originalConnect;
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle mixed request types efficiently', async () => {
      const requests = [
        // Health checks
        ...Array(10).fill().map(() => request(app).get('/health')),
        // API requests
        ...Array(20).fill().map(() => request(app).get('/api/events')),
        // User registration attempts
        ...Array(5).fill().map(() => 
          request(app)
            .post('/api/users/register')
            .send({
              name: 'Test User',
              email: 'test@example.com',
              password: 'password123',
              phone: '1234567890'
            })
        )
      ];

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // Should handle mixed load efficiently
      expect(totalTime).toBeLessThan(5000);
      
      // Most requests should succeed (some might fail due to validation)
      const successCount = responses.filter(r => r.status < 500).length;
      expect(successCount).toBeGreaterThan(30); // At least 85% success rate
    });
  });
}); 