/**
 * Environment Configuration
 * Centralized configuration management for different environments
 */

require('dotenv').config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 5001,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: process.env.NODE_ENV === 'production' 
        ? [
          'https://campverse-frontend.onrender.com',
          'https://campverse-alqa.onrender.com'
        ]
        : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173'
        ]
    }
  },

  // Database configuration
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/campverse',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
      bufferMaxEntries: 0,
      bufferCommands: false,
      heartbeatFrequencyMS: 10000,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    options: {
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          return Math.min(options.attempt * 100, 3000);
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      },
      socket: {
        connectTimeout: 10000,
        keepAlive: 30000,
        reconnectDelay: 1000,
      }
    }
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  // Email configuration
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    service: 'gmail',
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER
  },

  // Google OAuth configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },

  // Firebase configuration
  firebase: {
    bucketName: process.env.FIREBASE_BUCKET || 'ccpccuj.appspot.com',
    keyFile: process.env.FIREBASE_KEY_FILE
  },

  // Rate limiting configuration
  rateLimit: {
    auth: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100
    },
    strict: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5
    }
  },

  // Security configuration
  security: {
    bcryptRounds: 10,
    passwordMinLength: 8,
    passwordPattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    corsMaxAge: 86400,
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\''],
          scriptSrc: ['\'self\''],
          imgSrc: ['\'self\'', 'data:', 'https:'],
        },
      },
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
    file: {
      enabled: process.env.NODE_ENV === 'production',
      filename: 'logs/app.log',
      maxSize: '20m',
      maxFiles: '14d'
    }
  },

  // File upload configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxFiles: 5
  }
};

// Validation function
function validateConfig() {
  const required = [
    'JWT_SECRET',
    'MONGO_URI',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate email format
  if (config.email.user && !config.email.user.includes('@')) {
    throw new Error('Invalid EMAIL_USER format');
  }

  // Validate MongoDB URI format
  if (config.database.uri && !config.database.uri.startsWith('mongodb://') && !config.database.uri.startsWith('mongodb+srv://')) {
    throw new Error('Invalid MONGO_URI format');
  }

  return true;
}

// Export configuration
module.exports = {
  config,
  validateConfig,
  get: (key) => {
    const keys = key.split('.');
    let value = config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
};
