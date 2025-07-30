const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let app;
let authToken;
let testUser;
let testHost;

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

// Mock email service
jest.mock('../Services/email.js', () => ({
  sendOTP: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

// Mock OTP service
jest.mock('../Services/otp.js', () => ({
  generateOTP: jest.fn().mockReturnValue('123456'),
  verifyOTP: jest.fn().mockResolvedValue(true)
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
    await collections[key].deleteMany();
  }

  // Create a test user and get auth token
  const userData = testUtils.createTestUser();
  
  await request(app)
    .post('/api/users/register')
    .send(userData);
  
  const loginResponse = await request(app)
    .post('/api/users/login')
    .send({
      email: userData.email,
      password: userData.password
    });
  
  authToken = loginResponse.body.token;
  testUser = loginResponse.body.user;

  // Create a test host
  const hostData = {
    name: 'Test Host',
    email: 'host@test.com',
    phone: '+1234567890',
    organization: 'Test Organization'
  };

  const hostResponse = await request(app)
    .post('/api/hosts/register')
    .send(hostData);

  testHost = hostResponse.body.host;
});

describe('Event Creation', () => {
  test('POST /api/events should create a new event successfully', async () => {
    const eventData = testUtils.createTestEvent({
      hostId: testHost._id
    });
    
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventData);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'Event created successfully');
    expect(response.body).toHaveProperty('event');
    expect(response.body.event).toHaveProperty('title', eventData.title);
    expect(response.body.event).toHaveProperty('description', eventData.description);
    expect(response.body.event).toHaveProperty('hostId', testHost._id);
  });

  test('POST /api/events should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Event'
        // Missing required fields
      });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/events should return 401 without authentication', async () => {
    const eventData = testUtils.createTestEvent({
      hostId: testHost._id
    });
    
    const response = await request(app)
      .post('/api/events')
      .send(eventData);
    
    expect(response.status).toBe(401);
  });

  test('POST /api/events should return 400 for invalid date format', async () => {
    const eventData = testUtils.createTestEvent({
      hostId: testHost._id,
      startDate: 'invalid-date',
      endDate: 'invalid-date'
    });
    
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventData);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

describe('Event Retrieval', () => {
  let testEvent;

  beforeEach(async () => {
    // Create a test event
    const eventData = testUtils.createTestEvent({
      hostId: testHost._id
    });
    
    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventData);
    
    testEvent = createResponse.body.event;
  });

  test('GET /api/events should return all events', async () => {
    const response = await request(app)
      .get('/api/events');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('events');
    expect(Array.isArray(response.body.events)).toBe(true);
    expect(response.body.events.length).toBeGreaterThan(0);
  });

  test('GET /api/events/:id should return specific event', async () => {
    const response = await request(app)
      .get(`/api/events/${testEvent._id}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('event');
    expect(response.body.event).toHaveProperty('_id', testEvent._id);
    expect(response.body.event).toHaveProperty('title', testEvent.title);
  });

  test('GET /api/events/:id should return 404 for non-existent event', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .get(`/api/events/${fakeId}`);
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  test('GET /api/events/search should search events by title', async () => {
    const response = await request(app)
      .get('/api/events/search')
      .query({ q: 'Test' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('events');
    expect(Array.isArray(response.body.events)).toBe(true);
  });
});

describe('Event Updates', () => {
  let testEvent;

  beforeEach(async () => {
    // Create a test event
    const eventData = testUtils.createTestEvent({
      hostId: testHost._id
    });
    
    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventData);
    
    testEvent = createResponse.body.event;
  });

  test('PUT /api/events/:id should update event successfully', async () => {
    const updateData = {
      title: 'Updated Event Title',
      description: 'Updated event description'
    };
    
    const response = await request(app)
      .put(`/api/events/${testEvent._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Event updated successfully');
    expect(response.body).toHaveProperty('event');
    expect(response.body.event).toHaveProperty('title', updateData.title);
    expect(response.body.event).toHaveProperty('description', updateData.description);
  });

  test('PUT /api/events/:id should return 404 for non-existent event', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const updateData = {
      title: 'Updated Event Title'
    };
    
    const response = await request(app)
      .put(`/api/events/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  test('PUT /api/events/:id should return 401 without authentication', async () => {
    const updateData = {
      title: 'Updated Event Title'
    };
    
    const response = await request(app)
      .put(`/api/events/${testEvent._id}`)
      .send(updateData);
    
    expect(response.status).toBe(401);
  });
});

describe('Event Participation', () => {
  let testEvent;

  beforeEach(async () => {
    // Create a test event
    const eventData = testUtils.createTestEvent({
      hostId: testHost._id
    });
    
    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventData);
    
    testEvent = createResponse.body.event;
  });

  test('POST /api/events/:id/participate should join event successfully', async () => {
    const response = await request(app)
      .post(`/api/events/${testEvent._id}/participate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Successfully joined the event');
  });

  test('POST /api/events/:id/participate should return 400 if already participating', async () => {
    // Join the event first
    await request(app)
      .post(`/api/events/${testEvent._id}/participate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    // Try to join again
    const response = await request(app)
      .post(`/api/events/${testEvent._id}/participate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('DELETE /api/events/:id/participate should leave event successfully', async () => {
    // Join the event first
    await request(app)
      .post(`/api/events/${testEvent._id}/participate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    // Leave the event
    const response = await request(app)
      .delete(`/api/events/${testEvent._id}/participate`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Successfully left the event');
  });
});

describe('Event Deletion', () => {
  let testEvent;

  beforeEach(async () => {
    // Create a test event
    const eventData = testUtils.createTestEvent({
      hostId: testHost._id
    });
    
    const createResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send(eventData);
    
    testEvent = createResponse.body.event;
  });

  test('DELETE /api/events/:id should delete event successfully', async () => {
    const response = await request(app)
      .delete(`/api/events/${testEvent._id}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Event deleted successfully');
  });

  test('DELETE /api/events/:id should return 404 for non-existent event', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const response = await request(app)
      .delete(`/api/events/${fakeId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
}); 