/**
 * Custom Error Classes for CampVerse Backend
 * Provides standardized error handling with proper HTTP status codes
 */

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service unavailable', statusCode = 503) {
    super(`${service}: ${message}`, statusCode);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

class BusinessLogicError extends AppError {
  constructor(message, statusCode = 422) {
    super(message, statusCode);
    this.name = 'BusinessLogicError';
  }
}

// Error factory functions for common scenarios
const createValidationError = (field, value, constraint) => {
  return new ValidationError(`Invalid ${field}: ${constraint}`, {
    field,
    value,
    constraint
  });
};

const createNotFoundError = (resource, id = null) => {
  const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
  return new NotFoundError(message);
};

const createConflictError = (resource, field, value) => {
  return new ConflictError(`${resource} with ${field} '${value}' already exists`);
};

const createAuthError = (reason = 'Invalid credentials') => {
  return new AuthenticationError(reason);
};

const createPermissionError = (action, resource) => {
  return new AuthorizationError(`Insufficient permissions to ${action} ${resource}`);
};

// Error type checking utilities
const isOperationalError = (error) => {
  return error instanceof AppError && error.isOperational;
};

const isDatabaseError = (error) => {
  return error instanceof DatabaseError || 
         error.name === 'MongoError' || 
         error.name === 'ValidationError' ||
         error.name === 'CastError';
};

const isValidationError = (error) => {
  return error instanceof ValidationError || 
         error.name === 'ValidationError';
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  BusinessLogicError,
  
  // Factory functions
  createValidationError,
  createNotFoundError,
  createConflictError,
  createAuthError,
  createPermissionError,
  
  // Utility functions
  isOperationalError,
  isDatabaseError,
  isValidationError
};