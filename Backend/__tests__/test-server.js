/**
 * Test Server Setup
 * Isolated test server to avoid port conflicts
 */

const express = require('express');
const mongoose = require('mongoose');
const { createClient } = require('redis');

// Test server configuration
const testServerConfig = {
  port: process.env.TEST_PORT || 5003,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/campverse_test',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
};

let testApp;
let testServer;
let redisClient;

// Initialize test server
const initTestServer = async () => {
  return new Promise((resolve, reject) => {
    try {
      // Create Express app
      testApp = express();
      
      // Basic middleware
      testApp.use(express.json());
      testApp.use(express.urlencoded({ extended: true }));
      
      // Health check endpoint
      testApp.get('/health', (req, res) => {
        res.json({
          status: 'OK',
          timestamp: new Date().toISOString(),
          environment: 'test'
        });
      });
      
      // Test endpoint
      testApp.get('/test', (req, res) => {
        res.json({ message: 'Test server is running' });
      });
      
      // Start server
      testServer = testApp.listen(testServerConfig.port, () => {
        console.log(`Test server running on port ${testServerConfig.port}`);
        resolve(testApp);
      });
      
    } catch (error) {
      reject(error);
    }
  });
};

// Connect to test database
const connectTestDatabase = async () => {
  try {
    await mongoose.connect(testServerConfig.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false,
      bufferMaxEntries: 0
    });
    console.log('Test database connected');
  } catch (error) {
    console.warn('Test database connection failed:', error.message);
  }
};

// Connect to test Redis
const connectTestRedis = async () => {
  try {
    redisClient = createClient({
      url: testServerConfig.redisUrl,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true
      }
    });
    
    redisClient.on('error', (err) => {
      console.warn('Test Redis connection failed:', err.message);
    });
    
    await redisClient.connect();
    console.log('Test Redis connected');
  } catch (error) {
    console.warn('Test Redis connection failed:', error.message);
  }
};

// Cleanup function
const cleanup = async () => {
  try {
    if (testServer) {
      await new Promise((resolve) => {
        testServer.close(resolve);
      });
    }
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
    }
    
    console.log('Test cleanup completed');
  } catch (error) {
    console.warn('Test cleanup error:', error.message);
  }
};

// Setup test environment
const setupTestEnvironment = async () => {
  try {
    await initTestServer();
    await connectTestDatabase();
    await connectTestRedis();
    
    return {
      app: testApp,
      server: testServer,
      cleanup
    };
  } catch (error) {
    console.error('Test environment setup failed:', error);
    throw error;
  }
};

module.exports = {
  setupTestEnvironment,
  cleanup,
  testServerConfig
};