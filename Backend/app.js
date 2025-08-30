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
const { cacheService } = require('./Services/cacheService');
const { memoryManager } = require('./Utils/memoryManager');

const app = express();

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
// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.',
});
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

// Basic security headers
app.use(helmet());

// Enable CORS for local frontend development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://campverse-frontend.onrender.com',
  'https://campverse-alqa.onrender.com' // production frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1 && origin !== undefined && allowedOrigins.indexOf('*') === -1) {
        return callback(null, false);
      }
      return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json({ limit: '1mb' }));

// Connect Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected');
  } catch (err) {
    console.error('Redis connection failed', err);
  }
})();

// Make redisClient available in req object via middleware (optional)
app.use((req, res, next) => {
  req.redisClient = redisClient;
  next();
});

// Health check endpoint for Docker and CI/CD
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Validate required environment variables (soft-fail locally to avoid exit on dev)
const requiredEnv = ['JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.warn(`Missing environment variable: ${key}. Using dev fallback.`);
  }
}

// Routes
app.use('/api/users', userRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/feedback', require('./Routes/feedbackRoutes'));
app.use('/api/support', require('./Routes/supportRoutes'));

// Apply rate limiter to sensitive routes (mount before potential route handlers)
app.use('/api/users/register', authLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/google-signin', authLimiter);
app.use('/api/users/verify', authLimiter);

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
  bufferMaxEntries: 0, // Disable mongoose buffering
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
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, closing MongoDB connection...');
      await mongoose.connection.close();
      process.exit(0);
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
      server.close(() => {
        logger.info('Server closed');
        mongoose.connection.close();
      });
    });
  })
  .catch((err) => {
    logger.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });


// Export app for testing
module.exports = app;
