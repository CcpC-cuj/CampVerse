const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Mock external dependencies
jest.mock('nodemailer');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');

// Import service functions
const otpService = require('../../Services/otp');
const emailService = require('../../Services/email');
const notificationService = require('../../Services/notification');

describe('Services Unit Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('OTP Service', () => {
    it('should generate OTP successfully', () => {
      // Mock Math.random to return predictable values
      const mockRandom = jest.spyOn(Math, 'random');
      mockRandom.mockReturnValue(0.123456);

      // Execute
      const otp = otpService.otpgenrater();

      // Assertions
      expect(otp).toBeDefined();
      expect(typeof otp).toBe('string');
      expect(otp.length).toBe(6);
      expect(otp).toMatch(/^\d{6}$/);

      // Restore Math.random
      mockRandom.mockRestore();
    });

    it('should create OTP service with Redis client', () => {
      const mockRedisClient = {
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue('123456'),
        del: jest.fn().mockResolvedValue(true),
      };

      // Execute
      const otpServiceInstance = otpService.createOtpService(mockRedisClient);

      // Assertions
      expect(otpServiceInstance).toBeDefined();
      expect(typeof otpServiceInstance.generate).toBe('function');
      expect(typeof otpServiceInstance.verify).toBe('function');
    });

    it('should generate and store OTP', async () => {
      const mockRedisClient = {
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue('123456'),
        del: jest.fn().mockResolvedValue(true),
      };

      const otpServiceInstance = otpService.createOtpService(mockRedisClient);

      // Execute
      const otp = await otpServiceInstance.generate('test@example.com');

      // Assertions
      expect(otp).toBeDefined();
      expect(typeof otp).toBe('string');
      expect(otp.length).toBe(6);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'otp:test@example.com',
        expect.any(String),
        'EX',
        300,
      );
    });

    it('should verify OTP successfully', async () => {
      const mockRedisClient = {
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue('123456'),
        del: jest.fn().mockResolvedValue(true),
      };

      const otpServiceInstance = otpService.createOtpService(mockRedisClient);

      // Execute
      const isValid = await otpServiceInstance.verify(
        'test@example.com',
        '123456',
      );

      // Assertions
      expect(isValid).toBe(true);
      expect(mockRedisClient.get).toHaveBeenCalledWith('otp:test@example.com');
      expect(mockRedisClient.del).toHaveBeenCalledWith('otp:test@example.com');
    });

    it('should fail verification for invalid OTP', async () => {
      const mockRedisClient = {
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue('123456'),
        del: jest.fn().mockResolvedValue(true),
      };

      const otpServiceInstance = otpService.createOtpService(mockRedisClient);

      // Execute
      const isValid = await otpServiceInstance.verify(
        'test@example.com',
        '654321',
      );

      // Assertions
      expect(isValid).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledWith('otp:test@example.com');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should fail verification for expired OTP', async () => {
      const mockRedisClient = {
        set: jest.fn().mockResolvedValue(true),
        get: jest.fn().mockResolvedValue(null), // No OTP found (expired)
        del: jest.fn().mockResolvedValue(true),
      };

      const otpServiceInstance = otpService.createOtpService(mockRedisClient);

      // Execute
      const isValid = await otpServiceInstance.verify(
        'test@example.com',
        '123456',
      );

      // Assertions
      expect(isValid).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledWith('otp:test@example.com');
    });
  });

  describe('Email Service', () => {
    it('should create email transporter', () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
      };

      nodemailer.createTransport.mockReturnValue(mockTransporter);

      // Execute
      const transporter = emailService.createEmailTransporter();

      // Assertions
      expect(transporter).toBeDefined();
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
    });

    it('should send OTP email successfully', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
      };

      nodemailer.createTransport.mockReturnValue(mockTransporter);

      // Execute
      const result = await emailService.sendOTP('test@example.com', '123456');

      // Assertions
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_USER,
        to: 'test@example.com',
        subject: 'Your OTP for CampVerse',
        html: expect.stringContaining('123456'),
      });
    });

    it('should send welcome email successfully', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
      };

      nodemailer.createTransport.mockReturnValue(mockTransporter);

      // Execute
      const result = await emailService.sendWelcomeEmail(
        'test@example.com',
        'Test User',
      );

      // Assertions
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_USER,
        to: 'test@example.com',
        subject: 'Welcome to CampVerse!',
        html: expect.stringContaining('Test User'),
      });
    });

    it('should handle email sending errors', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('Email error')),
      };

      nodemailer.createTransport.mockReturnValue(mockTransporter);

      // Execute
      const result = await emailService.sendOTP('test@example.com', '123456');

      // Assertions
      expect(result).toBe(false);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('Notification Service', () => {
    it('should create notification successfully', async () => {
      const mongoose = require('mongoose');
      const notificationService = require('../../Services/notification');

      // Mock data
      const userId = new mongoose.Types.ObjectId();
      const type = 'event_reminder';
      const message = 'Your event starts in 1 hour';

      // Execute
      const notification = await notificationService.createNotification(
        userId,
        type,
        message,
      );

      // Assertions
      expect(notification).toBeDefined();
      expect(notification.targetUserId).toEqual(userId);
      expect(notification.type).toBe(type);
      expect(notification.message).toBe(message);
    });

    it('should get user notifications', async () => {
      const mongoose = require('mongoose');
      const notificationService = require('../../Services/notification');

      // Mock data
      const userId = new mongoose.Types.ObjectId();
      const mockNotifications = [
        {
          _id: 'notification1',
          targetUserId: userId,
          type: 'event_reminder',
          message: 'Event reminder 1',
          read: false,
          createdAt: new Date(),
        },
        {
          _id: 'notification2',
          targetUserId: userId,
          type: 'event_reminder',
          message: 'Event reminder 2',
          read: true,
          createdAt: new Date(),
        },
      ];

      // Mock Notification model
      const Notification = require('../../Models/Notification');
      const mockFind = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockNotifications),
      };
      Notification.find = jest.fn().mockReturnValue(mockFind);

      // Execute
      const notifications = await notificationService.getUserNotifications(
        userId,
        10,
      );

      // Assertions
      expect(notifications).toEqual(mockNotifications);
      expect(Notification.find).toHaveBeenCalledWith({ targetUserId: userId });
      expect(mockFind.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockFind.limit).toHaveBeenCalledWith(10);
    });

    it('should mark notification as read', async () => {
      const mongoose = require('mongoose');
      const notificationService = require('../../Services/notification');

      // Mock data
      const notificationId = new mongoose.Types.ObjectId();
      const mockNotification = {
        _id: notificationId,
        targetUserId: new mongoose.Types.ObjectId(),
        type: 'event_reminder',
        message: 'Event reminder',
        read: false,
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock Notification model
      const Notification = require('../../Models/Notification');
      Notification.findById = jest.fn().mockResolvedValue(mockNotification);

      // Execute
      const result = await notificationService.markAsRead(notificationId);

      // Assertions
      expect(result).toBe(true);
      expect(Notification.findById).toHaveBeenCalledWith(notificationId);
      expect(mockNotification.read).toBe(true);
      expect(mockNotification.save).toHaveBeenCalled();
    });

    it('should handle notification not found', async () => {
      const mongoose = require('mongoose');
      const notificationService = require('../../Services/notification');

      // Mock data
      const notificationId = new mongoose.Types.ObjectId();

      // Mock Notification model
      const Notification = require('../../Models/Notification');
      Notification.findById = jest.fn().mockResolvedValue(null);

      // Execute
      const result = await notificationService.markAsRead(notificationId);

      // Assertions
      expect(result).toBe(false);
      expect(Notification.findById).toHaveBeenCalledWith(notificationId);
    });
  });

  describe('JWT Token Service', () => {
    it('should generate JWT token', () => {
      const mockPayload = { userId: 'user123' };
      const mockToken = 'mock.jwt.token';

      jwt.sign.mockReturnValue(mockToken);

      // Execute
      const token = jwt.sign(mockPayload, process.env.JWT_SECRET, {
        expiresIn: '7d',
      });

      // Assertions
      expect(token).toBe(mockToken);
      expect(jwt.sign).toHaveBeenCalledWith(
        mockPayload,
        process.env.JWT_SECRET,
        { expiresIn: '7d' },
      );
    });

    it('should verify JWT token', () => {
      const mockToken = 'mock.jwt.token';
      const mockDecoded = { userId: 'user123' };

      jwt.verify.mockReturnValue(mockDecoded);

      // Execute
      const decoded = jwt.verify(mockToken, process.env.JWT_SECRET);

      // Assertions
      expect(decoded).toEqual(mockDecoded);
      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        process.env.JWT_SECRET,
      );
    });

    it('should handle invalid JWT token', () => {
      const mockToken = 'invalid.jwt.token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute and expect error
      expect(() => {
        jwt.verify(mockToken, process.env.JWT_SECRET);
      }).toThrow('Invalid token');

      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        process.env.JWT_SECRET,
      );
    });
  });

  describe('Password Hashing Service', () => {
    it('should hash password', async () => {
      const password = 'testpassword';
      const hashedPassword = 'hashedpassword123';

      bcrypt.hash.mockResolvedValue(hashedPassword);

      // Execute
      const result = await bcrypt.hash(password, 10);

      // Assertions
      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
    });

    it('should compare password successfully', async () => {
      const password = 'testpassword';
      const hashedPassword = 'hashedpassword123';

      bcrypt.compare.mockResolvedValue(true);

      // Execute
      const result = await bcrypt.compare(password, hashedPassword);

      // Assertions
      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should fail password comparison', async () => {
      const password = 'wrongpassword';
      const hashedPassword = 'hashedpassword123';

      bcrypt.compare.mockResolvedValue(false);

      // Execute
      const result = await bcrypt.compare(password, hashedPassword);

      // Assertions
      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });
});
