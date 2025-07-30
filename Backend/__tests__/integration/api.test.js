const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let mongoServer;
let app;
let authToken;
let testUser;

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

jest.mock('../Services/email.js', () => ({
  sendOTP: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../Services/otp.js', () => ({
  otpgenrater: jest.fn().mockReturnValue('123456'),
  createOtpService: jest.fn(() => ({
    generate: jest.fn().mockReturnValue('123456'),
    verify: jest.fn().mockResolvedValue(true)
  }))
}));

describe('API Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    process.env.MONGO_URI = mongoUri;
    
    app = require('../../app');
    
    // Create test user
    const User = require('../Models/User');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: hashedPassword,
      phone: '1234567890',
      role: 'user'
    });
    
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('Authentication Endpoints', () => {
    it('POST /api/users/register - should register new user', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        phone: '9876543210'
      };

      const response = await request(app)
        .post('/api/users/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
    });

    it('POST /api/users/login - should login existing user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'testpassword123'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(loginData.email);
    });

    it('POST /api/users/login - should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('User Profile Endpoints', () => {
    it('GET /api/users/me - should get user profile', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe('test@example.com');
    });

    it('PUT /api/users/me - should update user profile', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio'
      };

      const response = await request(app)
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Profile updated successfully');
      expect(response.body.user.name).toBe(updateData.name);
      expect(response.body.user.bio).toBe(updateData.bio);
    });

    it('GET /api/users/me - should reject without token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Event Endpoints', () => {
    it('POST /api/events - should create new event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        type: 'workshop',
        organizer: 'Test Organizer',
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z')
        },
        capacity: 50
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${authToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(eventData.title);
      expect(response.body.description).toBe(eventData.description);
      expect(response.body.type).toBe(eventData.type);
    });

    it('GET /api/events - should get all events', async () => {
      // First create an event
      const Event = require('../Models/Event');
      await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        type: 'workshop',
        organizer: 'Test Organizer',
        hostUserId: testUser._id,
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z')
        }
      });

      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('description');
    });

    it('GET /api/events/:id - should get specific event', async () => {
      const Event = require('../Models/Event');
      const event = await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        type: 'workshop',
        organizer: 'Test Organizer',
        hostUserId: testUser._id,
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z')
        }
      });

      const response = await request(app)
        .get(`/api/events/${event._id}`)
        .expect(200);

      expect(response.body._id).toBe(event._id.toString());
      expect(response.body.title).toBe('Test Event');
    });

    it('PUT /api/events/:id - should update event', async () => {
      const Event = require('../Models/Event');
      const event = await Event.create({
        title: 'Original Title',
        description: 'Original Description',
        type: 'workshop',
        organizer: 'Test Organizer',
        hostUserId: testUser._id,
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z')
        }
      });

      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description'
      };

      const response = await request(app)
        .put(`/api/events/${event._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
    });
  });

  describe('Certificate Endpoints', () => {
    it('POST /api/certificates - should create certificate', async () => {
      const Event = require('../Models/Event');
      const event = await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        type: 'workshop',
        organizer: 'Test Organizer',
        hostUserId: testUser._id,
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z')
        }
      });

      const certificateData = {
        eventId: event._id,
        title: 'Test Certificate',
        description: 'Test Certificate Description',
        type: 'completion'
      };

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(certificateData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.title).toBe(certificateData.title);
      expect(response.body.userId).toBe(testUser._id.toString());
    });

    it('GET /api/certificates - should get user certificates', async () => {
      const Certificate = require('../Models/Certificate');
      await Certificate.create({
        userId: testUser._id,
        eventId: new mongoose.Types.ObjectId(),
        title: 'Test Certificate',
        description: 'Test Description',
        type: 'completion'
      });

      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Institution Endpoints', () => {
    it('GET /api/institutions - should get institutions', async () => {
      const Institution = require('../Models/Institution');
      await Institution.create({
        name: 'Test University',
        type: 'university',
        emailDomain: 'test.edu',
        location: {
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country'
        }
      });

      const response = await request(app)
        .get('/api/institutions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({ name: 'Test User' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should limit repeated requests', async () => {
      const requests = Array(15).fill().map(() => 
        request(app)
          .post('/api/users/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      
      expect(rateLimited).toBe(true);
    });
  });
}); 