/**
 * Input Validation Middleware
 * Provides comprehensive validation for API requests
 */

const joi = require('joi');
const { ValidationError } = require('../Utils/errors');

// Common validation schemas
const commonSchemas = {
  objectId: joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  email: joi.string().email().pattern(/\.(ac|edu)\.in$|\.edu$/).message('Must be a valid academic email'),
  url: joi.string().uri({ scheme: ['http', 'https'] }),
  phone: joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).message('Invalid phone number format'),
  password: joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  name: joi.string().min(2).max(100).trim(),
  description: joi.string().max(2000).trim(),
  tags: joi.array().items(joi.string().max(50)).max(10),
};

// User validation schemas
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
  }),

  login: joi.object({
    email: commonSchemas.email.required(),
    password: joi.string().required(),
  }),

  updateProfile: joi.object({
    name: commonSchemas.name.optional(),
    phone: commonSchemas.phone.optional(),
    location: joi.string().max(100).optional(),
    bio: commonSchemas.description.optional(),
    interests: commonSchemas.tags.optional(),
    skills: commonSchemas.tags.optional(),
    learningGoals: commonSchemas.tags.optional(),
  }),

  changePassword: joi.object({
    currentPassword: joi.string().required(),
    newPassword: commonSchemas.password.required(),
  }),

  forgotPassword: joi.object({
    email: commonSchemas.email.required(),
  }),

  resetPassword: joi.object({
    token: joi.string().required(),
    password: commonSchemas.password.required(),
  }),
};

// Institution validation schemas
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
  }),

  requestNew: joi.object({
    name: commonSchemas.name.required(),
    type: joi.string().valid('college', 'university', 'org', 'temporary').required(),
    website: commonSchemas.url.optional(),
    phone: commonSchemas.phone.optional(),
    info: commonSchemas.description.optional(),
  }),

  requestVerification: joi.object({
    institutionName: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    website: commonSchemas.url.optional(),
    phone: commonSchemas.phone.optional(),
    type: joi.string().valid('college', 'university', 'org', 'temporary').optional(),
    info: commonSchemas.description.optional(),
  }),

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
  }),

  rejectVerification: joi.object({
    remarks: joi.string().max(500).required(),
  }),
};

// Event validation schemas
const eventSchemas = {
  create: joi.object({
    title: commonSchemas.name.required(),
    description: commonSchemas.description.required(),
    tags: commonSchemas.tags.optional(),
    type: joi.string().max(50).required(),
    organizer: commonSchemas.name.required(),
    schedule: joi.object({
      start: joi.date().iso().required(),
      end: joi.date().iso().min(joi.ref('start')).required(),
    }).required(),
    isPaid: joi.boolean().default(false),
    price: joi.number().min(0).when('isPaid', { is: true, then: joi.required() }),
    capacity: joi.number().integer().min(1).max(10000).optional(),
    features: joi.object({
      certificateEnabled: joi.boolean().default(false),
      chatEnabled: joi.boolean().default(false),
    }).optional(),
  }),

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
    capacity: joi.number().integer().min(1).max(10000).optional(),
    features: joi.object({
      certificateEnabled: joi.boolean().optional(),
      chatEnabled: joi.boolean().optional(),
    }).optional(),
  }),

  rsvp: joi.object({
    eventId: commonSchemas.objectId.required(),
  }),

  scanQr: joi.object({
    eventId: commonSchemas.objectId.required(),
    qrToken: joi.string().required(),
  }),

  nominateCoHost: joi.object({
    eventId: commonSchemas.objectId.required(),
    userId: commonSchemas.objectId.required(),
  }),
};

// Feedback validation schemas
const feedbackSchemas = {
  submit: joi.object({
    rating: joi.number().integer().min(1).max(5).required(),
    category: joi.string().valid('ui', 'bug', 'feature', 'performance', 'events', 'other').required(),
    subject: joi.string().max(200).required(),
    message: commonSchemas.description.required(),
    eventId: commonSchemas.objectId.optional(),
  }),

  update: joi.object({
    status: joi.string().valid('open', 'in-progress', 'resolved', 'closed').required(),
    adminNotes: joi.string().max(1000).optional(),
    priority: joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  }),
};

// Support validation schemas
const supportSchemas = {
  createTicket: joi.object({
    topic: joi.string().valid('account', 'events', 'technical', 'billing', 'other').required(),
    subject: joi.string().max(200).required(),
    message: commonSchemas.description.required(),
    priority: joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  }),

  updateTicket: joi.object({
    status: joi.string().valid('open', 'in-progress', 'waiting', 'resolved', 'closed').required(),
    adminNotes: joi.string().max(1000).optional(),
    priority: joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  }),
};

// Query parameter validation schemas
const querySchemas = {
  pagination: joi.object({
    page: joi.number().integer().min(1).default(1),
    limit: joi.number().integer().min(1).max(100).default(20),
    sort: joi.string().optional(),
    order: joi.string().valid('asc', 'desc').default('desc'),
  }),

  search: joi.object({
    q: joi.string().min(1).max(100).required(),
    category: joi.string().optional(),
    type: joi.string().optional(),
  }),

  dateRange: joi.object({
    startDate: joi.date().iso().optional(),
    endDate: joi.date().iso().min(joi.ref('startDate')).optional(),
  }),
};

// Validation middleware factory
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw new ValidationError('Validation failed', details);
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
}

// Sanitization helpers
const sanitize = {
  html: (text) => {
    if (typeof text !== 'string') return text;
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  sql: (text) => {
    if (typeof text !== 'string') return text;
    return text.replace(/['";\\]/g, '');
  },

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
};

// Sanitization middleware
function sanitizeInput(req, res, next) {
  req.body = sanitize.trim(req.body);
  req.query = sanitize.trim(req.query);
  req.params = sanitize.trim(req.params);
  next();
}

// File upload validation
const fileValidation = {
  image: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
  },
  
  document: {
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 3,
  },
};

function validateFile(type = 'image') {
  return (req, res, next) => {
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
        if (!config.allowedTypes.includes(file.mimetype)) {
          throw new ValidationError(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`);
        }

        if (file.size > config.maxSize) {
          throw new ValidationError(`File too large. Maximum size: ${config.maxSize / (1024 * 1024)}MB`);
        }
      }
    }

    next();
  };
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

  // Utilities
  sanitize,
  fileValidation,
};