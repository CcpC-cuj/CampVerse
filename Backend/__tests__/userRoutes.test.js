const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
});

describe('User Registration', () => {
  test('POST /api/users/register should register a new user successfully', async () => {
    const userData = testUtils.createTestUser();
    
    const response = await request(app)
      .post('/api/users/register')
      .send(userData);
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'User registered successfully');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', userData.email);
    expect(response.body.user).toHaveProperty('name', userData.name);
    expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned
  });

  test('POST /api/users/register should return 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email: 'test@example.com'
        // Missing password
      });
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/users/register should return 400 for invalid email format', async () => {
    const userData = testUtils.createTestUser({ email: 'invalid-email' });
    
    const response = await request(app)
      .post('/api/users/register')
      .send(userData);
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/users/register should return 409 for duplicate email', async () => {
    const userData = testUtils.createTestUser();
    
    // Register first user
    await request(app)
      .post('/api/users/register')
      .send(userData);
    
    // Try to register with same email
    const response = await request(app)
      .post('/api/users/register')
      .send(userData);
    
    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error');
  });
});

describe('User Login', () => {
  let testUser;
  let userData;

  beforeEach(async () => {
    userData = testUtils.createTestUser();
    
    // Register a test user
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send(userData);
    
    testUser = registerResponse.body.user;
  });

  test('POST /api/users/login should login successfully with valid credentials', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: userData.email,
        password: userData.password
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', userData.email);
  });

  test('POST /api/users/login should return 401 for invalid password', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: userData.email,
        password: 'wrongpassword'
      });
    
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/users/login should return 404 for non-existent user', async () => {
    const response = await request(app)
      .post('/api/users/login')
      .send({
        email: 'nonexistent@example.com',
        password: userData.password
      });
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});

describe('User Authentication', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Register and login a test user
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
  });

  test('GET /api/users/profile should return user profile with valid token', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', testUser.email);
  });

  test('GET /api/users/profile should return 401 without token', async () => {
    const response = await request(app)
      .get('/api/users/profile');
    
    expect(response.status).toBe(401);
  });

  test('GET /api/users/profile should return 401 with invalid token', async () => {
    const response = await request(app)
      .get('/api/users/profile')
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });
});

describe('User Profile Updates', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Register and login a test user
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
  });

  test('PUT /api/users/profile should update user profile successfully', async () => {
    const updateData = {
      name: 'Updated Name',
      phone: '+9876543210'
    };
    
    const response = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateData);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Profile updated successfully');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('name', updateData.name);
    expect(response.body.user).toHaveProperty('phone', updateData.phone);
  });
});

describe('Password Management', () => {
  let testUser;

  beforeEach(async () => {
    // Register a test user
    const userData = testUtils.createTestUser();
    
    const registerResponse = await request(app)
      .post('/api/users/register')
      .send(userData);
    
    testUser = registerResponse.body.user;
  });

  test('POST /api/users/forgot-password should send OTP for valid email', async () => {
    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({
        email: testUser.email
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'OTP sent to your email');
  });

  test('POST /api/users/forgot-password should return 404 for non-existent email', async () => {
    const response = await request(app)
      .post('/api/users/forgot-password')
      .send({
        email: 'nonexistent@example.com'
      });
    
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
}); 