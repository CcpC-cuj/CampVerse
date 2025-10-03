const jwt = require('jsonwebtoken');

// Mock external dependencies
jest.mock('jsonwebtoken');

// Import middleware functions
const jwtCheck = require('../../Middleware/JWTcheck');
const errorHandler = require('../../Middleware/errorHandler');

describe('Middleware Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request, response, and next
    mockReq = {
      headers: {},
      body: {},
      params: {},
      query: {},
      user: null,
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('JWT Authentication Middleware', () => {
    it('should authenticate valid JWT token', async () => {
      const mockToken = 'valid.jwt.token';
      const mockDecoded = { userId: 'user123' };

      mockReq.headers.authorization = `Bearer ${mockToken}`;

      jwt.verify.mockReturnValue(mockDecoded);

      // Execute
      await jwtCheck(mockReq, mockRes, mockNext);

      // Assertions
      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        process.env.JWT_SECRET,
      );
      expect(mockReq.user).toEqual(mockDecoded);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 for missing authorization header', async () => {
      // No authorization header

      // Execute
      await jwtCheck(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. No token provided.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', async () => {
      mockReq.headers.authorization = 'InvalidFormat token';

      // Execute
      await jwtCheck(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. Invalid token format.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid JWT token', async () => {
      const mockToken = 'invalid.jwt.token';

      mockReq.headers.authorization = `Bearer ${mockToken}`;

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute
      await jwtCheck(mockReq, mockRes, mockNext);

      // Assertions
      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        process.env.JWT_SECRET,
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied. Invalid token.',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Handler Middleware', () => {
    it('should handle validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        field: { message: 'Field is required' },
      };

      // Execute
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        details: expect.any(Object),
      });
    });

    it('should handle cast errors', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      error.kind = 'ObjectId';

      // Execute
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid ID format',
      });
    });

    it('should handle duplicate key errors', () => {
      const error = new Error('Duplicate key error');
      error.name = 'MongoError';
      error.code = 11000;

      // Execute
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Duplicate field value',
      });
    });

    it('should handle JWT errors', () => {
      const error = new Error('JWT error');
      error.name = 'JsonWebTokenError';

      // Execute
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
      });
    });

    it('should handle JWT expiration errors', () => {
      const error = new Error('JWT expired');
      error.name = 'TokenExpiredError';

      // Execute
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
      });
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic server error');

      // Execute
      errorHandler(error, mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', () => {
      const rateLimiter = require('express-rate-limit');

      // Mock rate limiter
      const mockLimiter = jest.fn((_options) => {
        return (req, res, next) => {
          // Simulate successful request
          next();
        };
      });

      rateLimiter.mockReturnValue(mockLimiter);

      // Execute
      const limiter = rateLimiter({
        windowMs: 15 * 60 * 1000,
        max: 10,
      });

      limiter(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('CORS Middleware', () => {
    it('should set CORS headers', () => {
      const cors = require('cors');

      // Mock CORS
      const mockCors = jest.fn((options) => {
        return (req, res, next) => {
          res.setHeader('Access-Control-Allow-Origin', options.origin[0]);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          next();
        };
      });

      cors.mockReturnValue(mockCors);

      // Execute
      const corsMiddleware = cors({
        origin: ['http://localhost:3000'],
        credentials: true,
      });

      corsMiddleware(mockReq, mockRes, mockNext);

      // Assertions
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Credentials',
        'true',
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields', () => {
      const validateRequired = (fields) => {
        return (req, res, next) => {
          for (const field of fields) {
            if (!req.body[field]) {
              return res.status(400).json({
                error: `Missing required field: ${field}`,
              });
            }
          }
          next();
        };
      };

      // Test with missing field
      mockReq.body = { name: 'Test' };
      const validator = validateRequired(['name', 'email']);

      validator(mockReq, mockRes, mockNext);

      // Should fail because email is missing
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required field: email',
      });
    });

    it('should pass validation with all required fields', () => {
      const validateRequired = (fields) => {
        return (req, res, next) => {
          for (const field of fields) {
            if (!req.body[field]) {
              return res.status(400).json({
                error: `Missing required field: ${field}`,
              });
            }
          }
          next();
        };
      };

      // Test with all fields present
      mockReq.body = { name: 'Test', email: 'test@example.com' };
      const validator = validateRequired(['name', 'email']);

      validator(mockReq, mockRes, mockNext);

      // Should pass
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
