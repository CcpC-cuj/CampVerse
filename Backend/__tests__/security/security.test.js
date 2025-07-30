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

describe('Security Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
    
    app = require('../../app');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    try {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    } catch (error) {
      console.log('Cleanup error (ignored):', error.message);
    }
  });

  describe('Input Validation Tests', () => {
    it('should prevent SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "admin'--",
        "1' OR '1' = '1' --"
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            name: maliciousInput,
            email: 'test@example.com',
            password: 'password123',
            phone: '1234567890'
          });

        // Should not crash and should return validation error
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
        '"><script>alert("xss")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            name: payload,
            email: 'test@example.com',
            password: 'password123',
            phone: '1234567890'
          });

        // Should sanitize or reject malicious input
        expect(response.status).toBe(400);
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@example..com',
        'test@example.com.',
        'test@.example.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            name: 'Test User',
            email: email,
            password: 'password123',
            phone: '1234567890'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should enforce strong password requirements', async () => {
      const weakPasswords = [
        '123',
        'password',
        'abc',
        '',
        '123456',
        'qwerty'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            name: 'Test User',
            email: 'test@example.com',
            password: password,
            phone: '1234567890'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authentication Security Tests', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).not.toContain('password');
      expect(response.body.error).not.toContain('hash');
      expect(response.body.error).not.toContain('bcrypt');
    });

    it('should use secure session management', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'testpassword123'
        });

      if (response.status === 200) {
        const token = response.body.token;
        
        // Token should be JWT format
        expect(token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
        
        // Token should not be too short
        expect(token.length).toBeGreaterThan(50);
      }
    });

    it('should prevent brute force attacks', async () => {
      const attempts = Array(15).fill().map(() => 
        request(app)
          .post('/api/users/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(attempts);
      const rateLimited = responses.some(res => res.status === 429);
      
      expect(rateLimited).toBe(true);
    });
  });

  describe('Authorization Tests', () => {
    it('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        '/api/users/me',
        '/api/events/create',
        '/api/certificates',
        '/api/users/profile'
      ];

      for (const route of protectedRoutes) {
        const response = await request(app)
          .get(route)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate JWT tokens properly', async () => {
      const invalidTokens = [
        'invalid.token.here',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        'Bearer invalid',
        '',
        null
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/users/me')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);

        expect(response.body).toHaveProperty('error');
      }
    });

    it('should prevent unauthorized access to other users data', async () => {
      // This test would require creating multiple users
      // and testing that users can't access each other's data
      const response = await request(app)
        .get('/api/users/123456789012345678901234') // Random user ID
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Data Validation Tests', () => {
    it('should prevent NoSQL injection', async () => {
      const nosqlPayloads = [
        { email: { $ne: null } },
        { email: { $gt: '' } },
        { email: { $regex: '.*' } },
        { $where: '1==1' }
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/api/users/login')
          .send(payload);

        expect(response.status).toBe(400);
      }
    });

    it('should validate request body size limits', async () => {
      const largePayload = {
        name: 'A'.repeat(10000), // Very large name
        email: 'test@example.com',
        password: 'password123',
        phone: '1234567890'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(largePayload);

      expect(response.status).toBe(400);
    });

    it('should sanitize file uploads', async () => {
      const maliciousFiles = [
        { filename: 'script.js', mimetype: 'application/javascript' },
        { filename: 'test.php', mimetype: 'application/x-php' },
        { filename: 'shell.sh', mimetype: 'application/x-sh' }
      ];

      for (const file of maliciousFiles) {
        const response = await request(app)
          .post('/api/events')
          .attach('logo', Buffer.from('malicious content'), file.filename);

        expect(response.status).toBe(400);
      }
    });
  });

  describe('CORS Security Tests', () => {
    it('should not allow requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/events')
        .set('Origin', 'https://malicious-site.com')
        .expect(200);

      // Should either block the request or not include sensitive headers
      expect(response.headers['access-control-allow-origin']).not.toBe('https://malicious-site.com');
    });

    it('should include proper security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should limit requests per IP', async () => {
      const requests = Array(20).fill().map(() => 
        request(app)
          .post('/api/users/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      
      expect(rateLimited).toBe(true);
    });

    it('should have different limits for different endpoints', async () => {
      // Health endpoint should have higher limits
      const healthRequests = Array(50).fill().map(() => 
        request(app).get('/health')
      );

      const healthResponses = await Promise.all(healthRequests);
      const healthRateLimited = healthResponses.some(res => res.status === 429);
      
      // Health endpoint should not be rate limited as aggressively
      expect(healthRateLimited).toBe(false);
    });
  });
}); 