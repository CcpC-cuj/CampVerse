/**
 * Security Configuration
 * Centralized security settings and validation
 */

const crypto = require('crypto');

// Security configuration
const securityConfig = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || (() => {
      console.warn('⚠️  JWT_SECRET not set! Using insecure default for development only.');
      return 'insecure-default-secret-change-in-production';
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: 'campverse-api',
    audience: 'campverse-users'
  },

  // Password Security
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
    bcryptRounds: 12
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    authMax: 10, // limit authentication attempts
    strictMax: 5, // limit sensitive operations
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },

  // CORS Configuration
  cors: {
    origin: (() => {
      const environment = process.env.NODE_ENV || 'development';
      const isProduction = environment === 'production' || process.env.RENDER;
      
      if (isProduction) {
        return [
          'https://campverse-alqa.onrender.com',
          'https://campverse-26hm.onrender.com',
          process.env.FRONTEND_URL,
          process.env.BACKEND_URL
        ].filter(Boolean);
      }
      
      return [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
      ];
    })(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Correlation-ID',
      'X-API-Key'
    ]
  },

  // Security Headers
  headers: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", "https://api.campverse.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      geolocation: [],
      microphone: [],
      camera: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: []
    }
  },

  // Input Validation
  validation: {
    maxStringLength: 1000,
    maxArrayLength: 100,
    maxObjectDepth: 10,
    allowedFileTypes: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    sanitizeHtml: true,
    preventXss: true,
    preventSqlInjection: true,
    preventNoSqlInjection: true
  },

  // Session Security
  session: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    rolling: true
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  }
};

// Security validation functions
const securityValidators = {
  // Validate JWT secret strength
  validateJwtSecret: (secret) => {
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    if (secret === 'insecure-default-secret-change-in-production') {
      throw new Error('JWT_SECRET must be changed from default value');
    }
    return true;
  },

  // Validate password strength
  validatePassword: (password) => {
    const config = securityConfig.password;
    const errors = [];

    if (password.length < config.minLength) {
      errors.push(`Password must be at least ${config.minLength} characters long`);
    }
    if (password.length > config.maxLength) {
      errors.push(`Password must be no more than ${config.maxLength} characters long`);
    }
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Generate secure random string
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
  },

  // Hash sensitive data
  hashSensitiveData: (data) => {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
};

// Environment validation
const validateEnvironment = () => {
  const requiredEnvVars = [
    'JWT_SECRET',
    'MONGO_URI',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ];

  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing required environment variables: ${missing.join(', ')}`);
    
    // In test environment, provide fallbacks
    if (process.env.NODE_ENV === 'test') {
      console.log('🔧 Using test environment fallbacks...');
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-ci-cd-testing-only-32-chars-minimum';
      process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test';
      process.env.EMAIL_USER = process.env.EMAIL_USER || 'test@example.com';
      process.env.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'test-password';
    }
  }

  // Validate JWT secret if set
  if (process.env.JWT_SECRET) {
    try {
      securityValidators.validateJwtSecret(process.env.JWT_SECRET);
    } catch (error) {
      console.error(`❌ JWT_SECRET validation failed: ${error.message}`);
    }
  }
};

// Initialize security validation
validateEnvironment();

module.exports = {
  securityConfig,
  securityValidators,
  validateEnvironment
};