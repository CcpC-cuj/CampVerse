const winston = require('winston');
const { 
  isOperationalError, 
  isDatabaseError,
} = require('../Utils/errors');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'campverse-backend' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}

// Enhanced error handling middleware
function errorHandler(err, req, res, _next) {
  // Generate correlation ID for request tracking
  const correlationId = req.correlationId || generateCorrelationId();
  
  // Log error with context
  const errorContext = {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode
    }
  };

  // Handle different error types
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  if (isOperationalError(err)) {
    // Operational errors (expected)
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    
    // Log as warning for client errors, error for server errors
    if (statusCode >= 500) {
      logger.error('Operational Error', errorContext);
    } else {
      logger.warn('Client Error', errorContext);
    }
  } else if (isDatabaseError(err)) {
    // Database errors
    statusCode = 500;
    message = 'Database operation failed';
    
    // Handle specific MongoDB errors
    if (err.code === 11000) {
      statusCode = 409;
      message = 'Resource already exists';
      const field = Object.keys(err.keyPattern || {})[0];
      details = { field, message: `Duplicate value for ${field}` };
    } else if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
      details = { field: err.path, value: err.value };
    } else if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation failed';
      details = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      }));
    }
    
    logger.error('Database Error', errorContext);
  } else if (err.name === 'JsonWebTokenError') {
    // JWT errors
    statusCode = 401;
    message = 'Invalid token';
    logger.warn('JWT Error', errorContext);
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    logger.warn('Token Expired', errorContext);
  } else if (err.name === 'MulterError') {
    // File upload errors
    statusCode = 400;
    message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    }
    logger.warn('File Upload Error', errorContext);
  } else {
    // Unexpected errors
    logger.error('Unexpected Error', errorContext);
    
    // In production, don't expose internal error details
    if (process.env.NODE_ENV === 'production') {
      message = 'Something went wrong';
    } else {
      message = err.message;
      details = { stack: err.stack };
    }
  }

  // Send error response
  const errorResponse = {
    success: false,
    error: message,
    correlationId,
    timestamp: new Date().toISOString()
  };

  // Add details in development or for operational errors
  if (details && (process.env.NODE_ENV !== 'production' || isOperationalError(err))) {
    errorResponse.details = details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

// Generate correlation ID for request tracking
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware to add correlation ID to requests
function addCorrelationId(req, res, next) {
  req.correlationId = req.get('X-Correlation-ID') || generateCorrelationId();
  res.set('X-Correlation-ID', req.correlationId);
  next();
}

// Async error wrapper for route handlers
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason.toString(),
    stack: reason.stack,
    promise
  });
  
  // Graceful shutdown
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });
  
  // Graceful shutdown
  process.exit(1);
});

module.exports = {
  errorHandler,
  addCorrelationId,
  asyncHandler,
  logger
};
