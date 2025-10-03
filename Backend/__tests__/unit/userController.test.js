const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../Models/User');
const { sendWelcomeEmail } = require('../../Services/email');

// Mock external dependencies
jest.mock('../../Services/otp');
jest.mock('../../Services/email');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Import the controller functions
const userController = require('../../Controller/User');

describe('User Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request, response, and next
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Mock data
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '+1234567890',
      };

      mockReq.body = userData;

      // Mock bcrypt
      bcrypt.hash.mockResolvedValue('hashedPassword');
      bcrypt.compare.mockResolvedValue(true);

      // Mock User model
      const mockUser = {
        _id: 'user123',
        ...userData,
        password: 'hashedPassword',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findOne = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);

      // Mock JWT
      jwt.sign.mockReturnValue('mockToken');

      // Mock email service
      sendWelcomeEmail.mockResolvedValue(true);

      // Execute
      await userController.register(mockReq, mockRes, mockNext);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
      expect(User.create).toHaveBeenCalledWith({
        ...userData,
        password: 'hashedPassword',
      });
      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        userData.email,
        userData.name,
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: expect.objectContaining({
          _id: 'user123',
          name: userData.name,
          email: userData.email,
        }),
        token: 'mockToken',
      });
    });

    it('should return error if user already exists', async () => {
      const userData = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockReq.body = userData;

      // Mock existing user
      User.findOne = jest
        .fn()
        .mockResolvedValue({ email: 'existing@example.com' });

      // Execute
      await userController.register(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User already exists',
      });
    });

    it('should handle registration errors', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      };

      mockReq.body = userData;

      // Mock error
      User.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      // Execute
      await userController.register(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server error during registration.',
      });
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockReq.body = loginData;

      // Mock user
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Test User',
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockToken');

      // Execute
      await userController.login(mockReq, mockRes, mockNext);

      // Assertions
      expect(User.findOne).toHaveBeenCalledWith({ email: loginData.email });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginData.password,
        'hashedPassword',
      );
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user123' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Login successful',
        user: expect.objectContaining({
          _id: 'user123',
          email: 'test@example.com',
          name: 'Test User',
        }),
        token: 'mockToken',
      });
    });

    it('should return error for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockReq.body = loginData;

      // Mock no user found
      User.findOne = jest.fn().mockResolvedValue(null);

      // Execute
      await userController.login(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid email or password',
      });
    });

    it('should return error for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockReq.body = loginData;

      // Mock user
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      // Execute
      await userController.login(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid email or password',
      });
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        profilePicture: 'profile.jpg',
        bio: 'Test bio',
      };

      mockReq.user = { userId: 'user123' };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      // Execute
      await userController.getMe(mockReq, mockRes, mockNext);

      // Assertions
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 404 if user not found', async () => {
      mockReq.user = { userId: 'nonexistent' };

      User.findById = jest.fn().mockResolvedValue(null);

      // Execute
      await userController.getMe(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found',
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        bio: 'Updated bio',
      };

      mockReq.body = updateData;
      mockReq.user = { userId: 'user123' };

      const mockUser = {
        _id: 'user123',
        name: 'Original Name',
        email: 'test@example.com',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      // Execute
      await userController.updateMe(mockReq, mockRes, mockNext);

      // Assertions
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.name).toBe('Updated Name');
      expect(mockUser.bio).toBe('Updated bio');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        user: mockUser,
      });
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account successfully', async () => {
      mockReq.user = { userId: 'user123' };

      const mockUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        remove: jest.fn().mockResolvedValue(true),
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      // Execute
      await userController.deleteUser(mockReq, mockRes, mockNext);

      // Assertions
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockUser.remove).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Account deleted successfully',
      });
    });
  });
});
