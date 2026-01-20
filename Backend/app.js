/*
 * This is the main backend entry file.
 * It serves as the parent file that connects all backend routes and middleware.
 */
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
const { createClient } = require('redis');
const { createServer } = require('http');
const { Server } = require('socket.io');
const userRoutes = require('./Routes/userRoutes');
const hostRoutes = require('./Routes/hostRoutes');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const institutionRoutes = require('./Routes/institutionRoutes');
const eventRoutes = require('./Routes/eventRoutes');
const certificateRoutes = require('./Routes/certificateRoutes');
const certificateManagementRoutes = require('./Routes/certificateManagementRoutes');
const certificateVerificationRoutes = require('./Routes/certificateVerificationRoutes');
const findUserRoutes = require('./Routes/findUserRoutes');
const recommendationRoutes = require('./Routes/recommendationRoutes');
const { errorHandler, addCorrelationId, logger } = require('./Middleware/errorHandler');
const { sanitizeInput } = require('./Middleware/validation');
const { smartTimeout, queueMiddleware } = require('./Middleware/timeout');
const { securityMiddleware, setRedisClient } = require('./Middleware/security');
const { cacheService } = require('./Services/cacheService');
const { memoryManager } = require('./Utils/memoryManager');
const SocketService = require('./Services/socketService');
const cookieParser = require('cookie-parser');
const cors = require('cors');  // CRITICAL: Import cors for cookie support

// Generate correlation ID for request tracking
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const app = express();
const httpServer = createServer(app);

// Set up Socket.IO with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: [
      'https://campverse.vercel.app',     // Production Vercel frontend
      'https://campverse-alqa.onrender.com',
      'https://campverse-26hm.onrender.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io available in req object for routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Initialize Socket Service
const socketService = new SocketService(io);

// Make socket service available in req object
app.use((req, res, next) => {
  req.socketService = socketService;
  next();
});

// Trust Render/Proxy to get correct client IPs for rate limiting and security
app.set('trust proxy', 1);

// CRITICAL: Define allowed origins for CORS
// Frontend: https://campverse-alqa.onrender.com
// Backend: https://campverse-26hm.onrender.com
const allowedOrigins = [
  'https://camp-verse-three.vercel.app',  // New Vercel frontend
  'https://imkrish-campverse-backend.hf.space', // New HF backend Space
  'https://campverse-alqa.onrender.com',  // Old Production Render frontend
  'https://campverse-26hm.onrender.com',  // Old Production Render backend
  'https://campverse.vercel.app',         // Other Vercel frontend
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

// Add any environment-specific origins
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

logger.info(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

// CRITICAL: Use cors middleware with credentials support for cookies
// This MUST come before cookieParser and routes
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Still allow for debugging, change to callback(new Error('Not allowed')) to block
    }
  },
  credentials: true,  // CRITICAL: Required for cookies to pass cross-origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
  maxAge: 86400 // Cache preflight for 24 hours
}));

// CRITICAL: Parse cookies BEFORE any routes that need them
// This is required for HttpOnly cookie-based refresh token
app.use(cookieParser());

// Initialize services
(async () => {
  try {
    await cacheService.connect();
    memoryManager.init();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed:', error);
  }
})();

// Early middleware
app.use(addCorrelationId);
app.use(sanitizeInput);
app.use(queueMiddleware);
app.use(smartTimeout);

// Security middleware will be set up after Redis client is initialized

// Rate limiting for different endpoint types
// Host-specific rate limiter (same as events)
const hostLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased from 1000 to 2000
  message: { error: 'Too many host API requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many host API requests, please try again later.' });
  }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Reduced window impact, sufficient for normal use
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many authentication attempts, please try again later.' });
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Increased from 1000 to 5000
  message: { error: 'Too many API requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many API requests, please try again later.' });
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Maintain strictness but ensure usability
  message: { error: 'Too many requests to this endpoint, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests to this endpoint, please try again later.' });
  }
});

// Relaxed rate limiter for recommendation engine (higher limits to avoid blocking legitimate requests)
const recommendationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased from 5000 to 10000
  message: { error: 'Too many recommendation requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated users (optional - can be removed for stricter control)
  skip: (req) => {
    return req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many recommendation requests, please try again later.' });
  }
});

// Apply rate limiters to different route types
app.use('/api/users/register', authLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/google-signin', authLimiter);
app.use('/api/users/link-google', authLimiter);
app.use('/api/users/verify', authLimiter);
app.use('/api/users/forgot-password', strictLimiter);
app.use('/api/users/reset-password', strictLimiter);

// Apply general API rate limiting
// app.use('/api/events', apiLimiter); // Removed as per user request
// app.use('/api/hosts', hostLimiter); // Removed as per user request
// app.use('/api/certificates', apiLimiter); // Removed as per user request
// app.use('/api/institutions', apiLimiter); // Removed as per user request
app.use('/api/recommendations', recommendationLimiter); // Relaxed limits for recommendation engine
app.use('/api/feedback', apiLimiter);
// app.use('/api/support', apiLimiter); // Removed as per user request

// Apply strict rate limiting to sensitive operations
app.use('/api/users/:id/grant-host', strictLimiter);
app.use('/api/users/:id/grant-verifier', strictLimiter);
app.use('/api/events/:id/participants', strictLimiter);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CampVerse API',
      version: '1.0.0',
    },
  },
  apis: ['./Routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Enhanced security headers with comprehensive protection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      scriptSrc: ['\'self\'', 'https://cdn.jsdelivr.net'],
      imgSrc: ['\'self\'', 'data:', 'https:', 'blob:'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
      connectSrc: ['\'self\'', 'https://api.campverse.com'],
      frameSrc: ['\'none'],
      objectSrc: ['\'none'],
      mediaSrc: ['\'self\''],
      workerSrc: ['\'self\'', 'blob:'],
      manifestSrc: ['\'self\''],
      upgradeInsecureRequests: [],
    },
    reportOnly: false,
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // xssFilter removed (deprecated)
}));

// Additional security middleware
app.use((req, res, next) => {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');

  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Add request ID for tracking
  if (!req.correlationId) {
    req.correlationId = generateCorrelationId();
  }

  next();
});

// Enable compression for better performance
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

// JSON body parser with error handling
app.use(express.json({ limit: '1mb' }));

// Handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format',
      message: err.message
    });
  }
  next(err);
});

// Connect Redis client with fallback
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    connectTimeout: 10000,
    keepAlive: 30000,
    reconnectDelay: 1000,
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
  // Don't exit, Redis is not critical for basic functionality
});

redisClient.on('connect', () => {
  logger.info('Redis connected successfully');
});

redisClient.on('ready', () => {
  logger.info('Redis is ready to accept commands');
});

redisClient.on('end', () => {
  logger.warn('Redis connection ended');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

(async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected');

    // Set up security middleware after Redis is connected
    setRedisClient(redisClient);
    const securityStack = securityMiddleware({
      enableBruteForceProtection: true,
      enableRequestSizeValidation: true,
      enableSqlInjectionProtection: true,
      enableNoSqlInjectionProtection: true,
      enableXssProtection: true,
      enableSecurityLogging: true,
      enableSecurityRateLimit: false,
      maxRequestSize: '2mb',
      bruteForceMaxAttempts: 5,
      bruteForceWindowMs: 15 * 60 * 1000,
      securityRateLimitWindowMs: 15 * 60 * 1000,
      securityRateLimitMax: 10
    });

    securityStack.forEach(middleware => app.use(middleware));
    logger.info('Security middleware initialized');

  } catch (err) {
    logger.error('Redis connection failed:', err);
    logger.warn('Continuing without Redis - some features may be limited');
  }
})();

// Make redisClient available in req object via middleware (optional)
app.use((req, res, next) => {
  req.redisClient = redisClient;
  next();
});

// Comprehensive health check endpoint for Docker and CI/CD
app.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        mongodb: 'unknown',
        redis: 'unknown',
        memory: 'unknown'
      },
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };

    // Check MongoDB status
    try {
      if (mongoose.connection.readyState === 1) {
        healthStatus.services.mongodb = 'connected';
      } else {
        healthStatus.services.mongodb = 'disconnected';
        healthStatus.status = 'DEGRADED';
      }
    } catch (err) {
      healthStatus.services.mongodb = 'error';
      healthStatus.status = 'DEGRADED';
    }

    // Check Redis status (don't degrade status in test environment)
    try {
      if (redisClient.isOpen) {
        await redisClient.ping();
        healthStatus.services.redis = 'connected';
      } else {
        healthStatus.services.redis = 'disconnected';
        // Only degrade status if not in test environment
        if (process.env.NODE_ENV !== 'test') {
          healthStatus.status = 'DEGRADED';
        }
      }
    } catch (err) {
      healthStatus.services.redis = 'error';
      // Only degrade status if not in test environment
      if (process.env.NODE_ENV !== 'test') {
        healthStatus.status = 'DEGRADED';
      }
    }

    // Check memory status
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const memoryPercentage = memUsage.rss / totalMemory;

      if (memoryPercentage < 0.8) {
        healthStatus.services.memory = 'healthy';
      } else if (memoryPercentage < 0.9) {
        healthStatus.services.memory = 'warning';
        healthStatus.status = 'DEGRADED';
      } else {
        healthStatus.services.memory = 'critical';
        healthStatus.status = 'DEGRADED';
      }
    } catch (err) {
      healthStatus.services.memory = 'error';
      healthStatus.status = 'DEGRADED';
    }

    // Set final status
    if (healthStatus.status === 'DEGRADED') {
      res.status(200).json(healthStatus);
    } else {
      res.status(200).json(healthStatus);
    }
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Healthcheck endpoint for Docker and monitoring
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// Validate required environment variables (soft-fail locally to avoid exit on dev)
const requiredEnv = ['JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    logger.warn(`Missing environment variable: ${key}. Using dev fallback.`);
  }
}

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    headers: {
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-methods': res.getHeader('Access-Control-Allow-Methods'),
      'access-control-allow-headers': res.getHeader('Access-Control-Allow-Headers'),
      'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials')
    }
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', require('./Routes/authRoutes'));
app.use('/api/hosts', hostRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/certificate-management', certificateManagementRoutes);
app.use('/api/certificate-verification', certificateVerificationRoutes);
app.use('/api', findUserRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/feedback', require('./Routes/feedbackRoutes'));
app.use('/api/support', require('./Routes/supportRoutes'));
app.use('/api/admin', require('./Routes/adminTemplateRoutes')); // Admin template management
app.use('/api/admin', require('./Routes/adminSettingsRoutes')); // Admin platform settings

// Initialize Socket.IO in notification service for real-time notifications
const { setSocketIO } = require('./Services/notification');
setSocketIO(io);

// Socket.IO event handlers
io.on('connection', (socket) => {
  logger.info(`New socket connection: ${socket.id}`);

  // Authentication event - join user room for notifications
  socket.on('authenticate', (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      socket.join(`user:${userId}`);
      logger.info(`Socket ${socket.id} authenticated for user ${userId}`);
      socket.emit('authenticated', { success: true, socketId: socket.id, userId });
    } catch (error) {
      logger.error('Socket authentication error:', error);
      socket.emit('authenticated', { success: false, error: 'Invalid token' });
    }
  });

  // API proxy events - bypass CORS by routing through WebSocket
  socket.on('api:users:google-signin', async (data) => {
    try {
      const { googleSignIn } = require('./Controller/User');
      // Create mock req/res objects for the controller
      const mockReq = { body: data };
      const mockRes = {
        status: (code) => ({
          json: (result) => socket.emit('api:users:google-signin:response', { status: code, data: result })
        }),
        json: (result) => socket.emit('api:users:google-signin:response', { status: 200, data: result })
      };
      await googleSignIn(mockReq, mockRes);
    } catch (error) {
      logger.error('Socket API error:', error);
      socket.emit('api:users:google-signin:response', { status: 500, error: error.message });
    }
  });

  // Generic API proxy
  socket.on('api:request', async (data) => {
    try {
      const { method, endpoint } = data;
      logger.info(`Socket API request: ${method} ${endpoint}`);

      // Route the request internally without CORS restrictions
      // This is a simplified proxy - you'd expand this for full API coverage
      socket.emit('api:response', {
        requestId: data.requestId,
        status: 200,
        data: { message: 'Socket API proxy working!', endpoint, method }
      });
    } catch (error) {
      logger.error('Socket API proxy error:', error);
      socket.emit('api:response', {
        requestId: data.requestId,
        status: 500,
        error: error.message
      });
    }
  });

  // Real-time notifications
  socket.on('join:notifications', (userId) => {
    socket.join(`user:${userId}`);
    logger.info(`Socket ${socket.id} joined notifications for user ${userId}`);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Centralized error handler (should be last)
app.use(errorHandler);

// MongoDB connection configuration with pooling
const mongoOptions = {
  // Connection pool settings
  maxPoolSize: 10, // Maximum number of connections in the pool
  minPoolSize: 2,  // Minimum number of connections in the pool
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // How long to try selecting a server
  socketTimeoutMS: 45000, // How long to wait for a response
  connectTimeoutMS: 10000, // How long to wait for initial connection

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Buffer settings
  bufferCommands: false, // Disable mongoose buffering

  // Heartbeat settings
  heartbeatFrequencyMS: 10000, // Heartbeat every 10 seconds

  // Other settings
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

// Connect MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI, mongoOptions)
  .then(() => {
    logger.info('MongoDB connected with connection pooling');

    // Log connection pool events
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      // Don't exit immediately, try to reconnect
      setTimeout(() => {
        logger.info('Attempting to reconnect to MongoDB...');
        mongoose.connect(process.env.MONGO_URI, mongoOptions).catch(reconnectErr => {
          logger.error('MongoDB reconnection failed:', reconnectErr);
        });
      }, 5000);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Initialize QR Code cleanup cron job
    const { runCleanup } = require('./Services/qrCleanupService');
    const cron = require('node-cron');

    // Run QR cleanup every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('[Cron] Starting hourly QR code cleanup...');
      try {
        const results = await runCleanup();
        logger.info('[Cron] QR cleanup completed:', results);
      } catch (err) {
        logger.error('[Cron] QR cleanup failed:', err);
      }
    });

    logger.info('QR code cleanup cron job scheduled (runs hourly)');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, closing MongoDB connection...');
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed gracefully');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    const PORT = process.env.PORT || 5001;
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info('Socket.IO server is ready for WebSocket connections');
    });

    // Server timeout configuration
    server.timeout = 30000; // 30 seconds
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

    // Graceful server shutdown
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      server.close(async () => {
        logger.info('Server closed');
        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed gracefully');
          process.exit(0);
        } catch (err) {
          logger.error('Error closing MongoDB connection:', err);
          process.exit(1);
        }
      });
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB:', err);
    // Don't exit immediately, give time for environment setup
    logger.info('Retrying MongoDB connection in 10 seconds...');
    setTimeout(() => {
      mongoose.connect(process.env.MONGO_URI, mongoOptions).catch(retryErr => {
        logger.error('MongoDB connection retry failed:', retryErr);
        process.exit(1);
      });
    }, 10000);
  });


// Export app for testing
module.exports = app;
