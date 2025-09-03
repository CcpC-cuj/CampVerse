/*
 * This is the main backend entry file.
 * It serves as the parent file that connects all backend routes and middleware.
 */
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createClient } = require('redis');
const userRoutes = require('./Routes/userRoutes');
const hostRoutes = require('./Routes/hostRoutes');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const institutionRoutes = require('./Routes/institutionRoutes');
const eventRoutes = require('./Routes/eventRoutes');
const certificateRoutes = require('./Routes/certificateRoutes');
const recommendationRoutes = require('./Routes/recommendationRoutes');
const { errorHandler, addCorrelationId, logger } = require('./Middleware/errorHandler');
const { sanitizeInput } = require('./Middleware/validation');
const { smartTimeout, queueMiddleware } = require('./Middleware/timeout');
const { securityMiddleware, setRedisClient } = require('./Middleware/security');
const { cacheService } = require('./Services/cacheService');
const { memoryManager } = require('./Utils/memoryManager');

// Generate correlation ID for request tracking
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const app = express();

// Trust Render/Proxy to get correct client IPs for rate limiting and security
app.set('trust proxy', 1);

// Priority CORS handler - This must be FIRST to ensure CORS headers are always set
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Only set CORS headers for allowed origins or no-origin requests
  if (!origin) {
    // Allow requests with no origin (like mobile apps, direct server requests)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Correlation-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  // Handle preflight requests immediately
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  
  next();
});

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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many requests to this endpoint, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to different route types
app.use('/api/users/register', authLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/google-signin', authLimiter);
app.use('/api/users/verify', authLimiter);
app.use('/api/users/forgot-password', strictLimiter);
app.use('/api/users/reset-password', strictLimiter);

// Apply general API rate limiting
app.use('/api/events', apiLimiter);
app.use('/api/certificates', apiLimiter);
app.use('/api/institutions', apiLimiter);
app.use('/api/recommendations', apiLimiter);
app.use('/api/feedback', apiLimiter);
app.use('/api/support', apiLimiter);

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

// Enable CORS for local frontend development
const allowedOrigins = (() => {
  const environment = process.env.NODE_ENV || 'development';
  const isRender = process.env.RENDER || process.env.RENDER_SERVICE_ID;
  const isProduction = environment === 'production' || isRender;
  
  logger.info(`Running in environment: ${environment}`);
  logger.info(`Render detected: ${!!isRender}`);
  logger.info(`Treating as production: ${isProduction}`);
  
  if (isProduction) {
    const origins = [
      'https://campverse-alqa.onrender.com',
      'https://campverse-26hm.onrender.com'  // Add current backend URL
    ];
    if (process.env.FRONTEND_URL) {
      origins.push(process.env.FRONTEND_URL);
      logger.info(`Added FRONTEND_URL to origins: ${process.env.FRONTEND_URL}`);
    }
    if (process.env.BACKEND_URL) {
      origins.push(process.env.BACKEND_URL);
      logger.info(`Added BACKEND_URL to origins: ${process.env.BACKEND_URL}`);
    }
    logger.info(`Production CORS origins: ${origins.join(', ')}`);
    return origins;
  }
  
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
  logger.info(`Development CORS origins: ${devOrigins.join(', ')}`);
  return devOrigins;
})();

// Manual CORS middleware for better debugging and control
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  logger.info(`Incoming request from origin: ${origin || 'no-origin'}`);
  logger.info(`Method: ${req.method}, URL: ${req.url}`);
  logger.info(`Allowed origins: ${allowedOrigins.join(', ')}`);
  
  // Set CORS headers for all requests
  if (!origin || allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Correlation-ID');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    logger.info(`CORS headers set for origin: ${origin || 'no-origin'}`);
  } else {
    logger.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.info('Handling OPTIONS preflight request');
    res.status(204).end();
    return;
  }
  
  next();
});

// Backup CORS middleware (keep the original one as backup)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        logger.warn(`CORS backup middleware blocked origin: ${origin}`);
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-ID'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
  }),
);

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

app.use(express.json({ limit: '1mb' }));

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
      enableSecurityRateLimit: true,
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

    // Check Redis status
    try {
      if (redisClient.isOpen) {
        await redisClient.ping();
        healthStatus.services.redis = 'connected';
      } else {
        healthStatus.services.redis = 'disconnected';
        healthStatus.status = 'DEGRADED';
      }
    } catch (err) {
      healthStatus.services.redis = 'error';
      healthStatus.status = 'DEGRADED';
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
app.use('/api/hosts', hostRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/feedback', require('./Routes/feedbackRoutes'));
app.use('/api/support', require('./Routes/supportRoutes'));

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
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`);
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
