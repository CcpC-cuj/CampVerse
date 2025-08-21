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
const errorHandler = require('./Middleware/errorHandler');

const app = express();

// Environment variables and Winston logger setup
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
  'https://campverse-alqa.onrender.com/' // production frontend
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

// Connect MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, '0.0.0.0', () => {
      console.log('Server is running on port 5001');
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });


// Export app for testing
module.exports = app;
