/**
 * Input Validation Middleware
 * Provides comprehensive validation for API requests with security enhancements
 */

const joi = require('joi');
const { ValidationError } = require('../Utils/errors');
const xss = require('xss');

// Enhanced sanitization functions
const sanitize = {
  // HTML sanitization to prevent XSS
  html: (text) => {
    if (typeof text !== 'string') return text;
    return xss(text, {
      whiteList: {}, // No HTML allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed']
    });
  },

  // SQL injection prevention
  sql: (text) => {
    if (typeof text !== 'string') return text;
    // Remove dangerous SQL characters
    return text.replace(/['";\\]/g, '').replace(/--/g, '').replace(/\/\*/g, '').replace(/\*\//g, '');
  },

  // NoSQL injection prevention
  nosql: (text) => {
    if (typeof text !== 'string') return text;
    // Remove MongoDB operators
    return text.replace(/\$/, '').replace(/\./, '');
  },

  // Trim and clean whitespace
  trim: (obj) => {
    if (typeof obj === 'string') {
      return obj.trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize.trim);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize.trim(value);
      }
      return sanitized;
    }
    return obj;
  },

  // Comprehensive sanitization
  deep: (obj) => {
    if (typeof obj === 'string') {
      return sanitize.html(sanitize.sql(sanitize.nosql(sanitize.trim(obj))));
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize.deep);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize.deep(value);
      }
      return sanitized;
    }
    return obj;
  }
};

// Common validation schemas with enhanced security
const commonSchemas = {
  objectId: joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  email: joi.string().email().pattern(/\.(ac|edu)\.in$|\.edu$/).message('Must be a valid academic email'),
  url: joi.string().uri({ scheme: ['http', 'https'] }).max(500),
  phone: joi.string().pattern(/^[+]?[1-9][\d]{0,15}$/).message('Invalid phone number format'),
  password: joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .message('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  name: joi.string().min(2).max(100).trim().pattern(/^[a-zA-Z\s]+$/).message('Name can only contain letters and spaces'),
  description: joi.string().max(2000).trim(),
  tags: joi.array().items(joi.string().max(50)).max(10),
  date: joi.date().iso().max('now'),
  positiveInteger: joi.number().integer().positive(),
  boolean: joi.boolean().strict(),
  uuid: joi.string().uuid()
};

// Enhanced user validation schemas
const userSchemas = {
  register: joi.object({
    name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    phone: commonSchemas.phone.optional(),
    location: joi.string().max(100).optional(),
    bio: commonSchemas.description.optional(),
    interests: commonSchemas.tags.optional(),
    skills: commonSchemas.tags.optional(),
  }).strict(), // Reject unknown fields

  login: joi.object({
    email: commonSchemas.email.required(),
    password: joi.string().required(),
  }).strict(),

  updateProfile: joi.object({
    name: commonSchemas.name.optional(),
    phone: commonSchemas.phone.optional(),
    location: joi.string().max(100).optional(),
    bio: commonSchemas.description.optional(),
    interests: commonSchemas.tags.optional(),
    skills: commonSchemas.tags.optional(),
    learningGoals: commonSchemas.tags.optional(),
  }).strict(),

  changePassword: joi.object({
    currentPassword: joi.string().required(),
    newPassword: commonSchemas.password.required(),
  }).strict(),

  forgotPassword: joi.object({
    email: commonSchemas.email.required(),
  }).strict(),

  resetPassword: joi.object({
    token: joi.string().required().min(32).max(64),
    password: commonSchemas.password.required(),
  }).strict(),
};

// Enhanced institution validation schemas
const institutionSchemas = {
  create: joi.object({
    name: commonSchemas.name.required(),
    type: joi.string().valid('college', 'university', 'org', 'temporary').required(),
    emailDomain: joi.string().domain().required(),
    website: commonSchemas.url.optional(),
    phone: commonSchemas.phone.optional(),
    info: commonSchemas.description.optional(),
    location: joi.object({
      city: joi.string().max(100).optional(),
      state: joi.string().max(100).optional(),
      country: joi.string().max(100).optional(),
    }).optional(),
  }).strict(),

  requestNew: joi.object({
    name: commonSchemas.name.required(),
    type: joi.string().valid('college', 'university', 'org', 'temporary').required(),
    website: commonSchemas.url.optional(),
    phone: commonSchemas.phone.optional(),
    info: commonSchemas.description.optional(),
  }).strict(),

  // REMOVED: requestVerification schema (redundant workflow removed)

  approveVerification: joi.object({
    website: commonSchemas.url.optional(),
    phone: commonSchemas.phone.optional(),
    info: commonSchemas.description.optional(),
    remarks: joi.string().max(500).optional(),
    location: joi.object({
      city: joi.string().max(100).optional(),
      state: joi.string().max(100).optional(),
      country: joi.string().max(100).optional(),
    }).optional(),
  }).strict(),

  rejectVerification: joi.object({
    remarks: joi.string().max(500).required(),
  }).strict(),
};

// Enhanced event validation schemas
const eventSchemas = {
  create: joi.object({
    title: commonSchemas.name.required(),
    description: commonSchemas.description.required(),
    tags: commonSchemas.tags.optional(),
    type: joi.string().max(50).required(),
    organizer: commonSchemas.name.required(),
    schedule: joi.object({
      start: joi.date().iso().min('now').required(),
      end: joi.date().iso().min(joi.ref('start')).required(),
    }).required(),
    isPaid: joi.boolean().default(false),
    price: joi.number().min(0).when('isPaid', { is: true, then: joi.required() }),
    capacity: commonSchemas.positiveInteger.max(10000).optional(),
    features: joi.object({
      certificateEnabled: joi.boolean().default(false),
      chatEnabled: joi.boolean().default(false),
    }).optional(),
    location: joi.string().max(200).optional(),
    maxParticipants: commonSchemas.positiveInteger.max(10000).optional(),
  }).strict(),

  update: joi.object({
    title: commonSchemas.name.optional(),
    description: commonSchemas.description.optional(),
    tags: commonSchemas.tags.optional(),
    type: joi.string().max(50).optional(),
    organizer: commonSchemas.name.optional(),
    schedule: joi.object({
      start: joi.date().iso().optional(),
      end: joi.date().iso().optional(),
    }).optional(),
    isPaid: joi.boolean().optional(),
    price: joi.number().min(0).optional(),
    capacity: commonSchemas.positiveInteger.max(10000).optional(),
    features: joi.object({
      certificateEnabled: joi.boolean().optional(),
      chatEnabled: joi.boolean().optional(),
    }).optional(),
    location: joi.string().max(200).optional(),
    maxParticipants: commonSchemas.positiveInteger.max(10000).optional(),
  }).strict(),

  rsvp: joi.object({
    eventId: commonSchemas.objectId.required(),
  }).strict(),

  scanQr: joi.object({
    eventId: commonSchemas.objectId.required(),
    qrToken: joi.string().required().min(16).max(64),
  }).strict(),

  nominateCoHost: joi.object({
    eventId: commonSchemas.objectId.required(),
    userId: commonSchemas.objectId.required(),
  }).strict(),
};

// Enhanced feedback validation schemas
const feedbackSchemas = {
  submit: joi.object({
    rating: joi.number().integer().min(1).max(5).required(),
    category: joi.string().valid('ui', 'bug', 'feature', 'performance', 'events', 'other').required(),
    subject: joi.string().max(200).required(),
    message: commonSchemas.description.required(),
    eventId: commonSchemas.objectId.optional(),
  }).strict(),

  update: joi.object({
    status: joi.string().valid('open', 'in-progress', 'resolved', 'closed').required(),
    adminNotes: joi.string().max(1000).optional(),
    priority: joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  }).strict(),
};

// Enhanced support validation schemas
const supportSchemas = {
  createTicket: joi.object({
    topic: joi.string().valid('account', 'events', 'technical', 'billing', 'other').required(),
    subject: joi.string().max(200).required(),
    message: commonSchemas.description.required(),
    priority: joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  }).strict(),

  updateTicket: joi.object({
    status: joi.string().valid('open', 'in-progress', 'waiting', 'resolved', 'closed').required(),
    adminNotes: joi.string().max(1000).optional(),
    priority: joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  }).strict(),
};

// Query parameter validation schemas
const querySchemas = {
  pagination: joi.object({
    page: joi.number().integer().min(1).max(1000).default(1),
    limit: joi.number().integer().min(1).max(100).default(20),
    sort: joi.string().valid('createdAt', 'updatedAt', 'name', 'title', 'date').optional(),
    order: joi.string().valid('asc', 'desc').default('desc'),
  }).strict(),

  search: joi.object({
    q: joi.string().min(1).max(100).required(),
    category: joi.string().optional(),
    type: joi.string().optional(),
  }).strict(),

  // Date range validation (for filtering, not for event creation)
  dateRange: joi.object({
    startDate: joi.date().iso().optional(), // Used for filtering date ranges
    endDate: joi.date().iso().min(joi.ref('startDate')).optional(), // Used for filtering date ranges
  }).strict(),
};

// Validation middleware factory with enhanced security
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = req[source];
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: false, // Don't convert types for security
        allowUnknown: false, // Reject unknown fields
      });

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        throw new ValidationError('Validation failed', details);
      }

      // Apply deep sanitization to validated data
      const sanitizedData = sanitize.deep(value);
      
      // Replace the original data with validated and sanitized data
      req[source] = sanitizedData;
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Enhanced sanitization middleware
function sanitizeInput(req, res, next) {
  try {
    // Apply sanitization to all input sources
    if (req.body) req.body = sanitize.deep(req.body);
    if (req.query) req.query = sanitize.deep(req.query);
    if (req.params) req.params = sanitize.deep(req.params);
    
    next();
  } catch (error) {
    next(error);
  }
}

// File upload validation with enhanced security
const fileValidation = {
  image: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  },
  
  document: {
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 3,
    allowedExtensions: ['.pdf', '.doc', '.docx'],
  },
};

function validateFile(type = 'image') {
  return (req, res, next) => {
    try {
      const config = fileValidation[type];
      if (!config) {
        throw new ValidationError('Invalid file validation type');
      }

      if (req.files) {
        const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
        
        if (files.length > config.maxFiles) {
          throw new ValidationError(`Too many files. Maximum ${config.maxFiles} allowed`);
        }

        for (const file of files) {
          // Check file type
          if (!config.allowedTypes.includes(file.mimetype)) {
            throw new ValidationError(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`);
          }

          // Check file extension
          const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
          if (!config.allowedExtensions.includes(fileExtension)) {
            throw new ValidationError(`Invalid file extension. Allowed: ${config.allowedExtensions.join(', ')}`);
          }

          // Check file size
          if (file.size > config.maxSize) {
            throw new ValidationError(`File too large. Maximum size: ${config.maxSize / (1024 * 1024)}MB`);
          }

          // Check for suspicious file names
          if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            throw new ValidationError('Invalid file name');
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Rate limiting validation
function validateRateLimit(req, res, next) {
  // Basic rate limiting check
  if (req.rateLimit && req.rateLimit.remaining === 0) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
  
  next();
}

module.exports = {
  // Schemas
  userSchemas,
  institutionSchemas,
  eventSchemas,
  feedbackSchemas,
  supportSchemas,
  querySchemas,
  commonSchemas,

  // Middleware
  validate,
  sanitizeInput,
  validateFile,
  validateRateLimit,

  // Utilities
  sanitize,
  fileValidation,
};