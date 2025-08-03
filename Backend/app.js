/*
 * This is the main backend entry file.
 * It serves as the parent file that connects all backend routes and middleware.
 */
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
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
const errorHandler = require('./Middleware/errorHandler');


const app = express();

// Remove sensitive logging in production
if (process.env.NODE_ENV !== 'production') {
  console.log('MONGO_URI:', process.env.MONGO_URI ? '***SET***' : 'NOT SET');
  console.log('REDIS_URL:', process.env.REDIS_URL ? '***SET***' : 'NOT SET');
}

// Winston logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    // Add file or remote transports for production
  ],
});
// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many sensitive operations, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for certificate generation
const certificateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 requests per hour
  message: 'Too many certificate generation requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
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

// Enable CORS for local frontend development
app.use(cors({
  origin: [
    'http://localhost:3000', // React default
    'http://localhost:5173', // Vite default
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Connect Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
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
    environment: process.env.NODE_ENV || 'development'
  });
});

// Validate required environment variables
['JWT_SECRET','EMAIL_USER','EMAIL_PASSWORD'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Apply rate limiter to sensitive routes
app.use('/api/users/register', authLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/google-signin', authLimiter);
app.use('/api/users/verify', authLimiter);
app.use('/api/users/forgot-password', authLimiter);
app.use('/api/users/reset-password', authLimiter);

// Apply rate limiting to sensitive operations
app.use('/api/events', sensitiveLimiter);
app.use('/api/certificates/generate', certificateLimiter);
app.use('/api/certificates/generate-batch', certificateLimiter);
app.use('/api/users/:id/grant-host', sensitiveLimiter);
app.use('/api/users/:id/grant-verifier', sensitiveLimiter);
app.use('/api/institutions', sensitiveLimiter);

// Centralized error handler (should be last)
app.use(errorHandler);

// Connect MongoDB and start server
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferMaxEntries: 0,
  bufferCommands: false
})
  .then(() => {
    console.log('MongoDB connected');
    app.listen(5001, '0.0.0.0', () => {
      console.log('Server is running on port 5001');
    });      
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    // Retry connection after 5 seconds
    setTimeout(() => {
      console.log('Retrying MongoDB connection...');
      mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false
      });
    }, 5000);
  });

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Remove duplicate logging
if (process.env.NODE_ENV !== 'production') {
  console.log('MONGO_URI:', process.env.MONGO_URI ? '***SET***' : 'NOT SET');
  console.log('REDIS_URL:', process.env.REDIS_URL ? '***SET***' : 'NOT SET');
}

// Export app for testing
module.exports = app;

// Scheduled cleanup task (run every hour)
const { cleanupRedis } = require('./scripts/cleanup');

// Schedule cleanup to run every hour
setInterval(async () => {
  try {
    await cleanupRedis();
  } catch (error) {
    console.error('Scheduled cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour
  