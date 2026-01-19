/**
 * Standard API Response Utilities
 * Provides consistent response format across all API endpoints
 * 
 * Standard Response Format:
 * {
 *   success: boolean,
 *   data: {} | null,
 *   error: string | null,
 *   message: string | null,
 *   meta?: { page, limit, total, totalPages } // For paginated responses
 * }
 */

const { logger } = require('../Middleware/errorHandler');

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {Object|Array} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data = null, message = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    error: null,
    message
  });
}

/**
 * Send a created response (201)
 * @param {Object} res - Express response object
 * @param {Object} data - Created resource data
 * @param {string} message - Success message
 */
function sendCreated(res, data = null, message = 'Resource created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {Object} details - Additional error details (optional)
 */
function sendError(res, error, statusCode = 400, details = null) {
  const response = {
    success: false,
    data: null,
    error,
    message: null
  };
  
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send a not found response (404)
 * @param {Object} res - Express response object
 * @param {string} resource - Name of the resource not found
 */
function sendNotFound(res, resource = 'Resource') {
  return sendError(res, `${resource} not found`, 404);
}

/**
 * Send an unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendUnauthorized(res, message = 'Unauthorized access') {
  return sendError(res, message, 401);
}

/**
 * Send a forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
function sendForbidden(res, message = 'Access forbidden') {
  return sendError(res, message, 403);
}

/**
 * Send a server error response (500)
 * @param {Object} res - Express response object
 * @param {Error} error - Error object (for logging)
 * @param {string} message - User-facing error message
 */
function sendServerError(res, error = null, message = 'Internal server error') {
  if (error) {
    logger.error('Server error:', error);
  }
  return sendError(res, message, 500);
}

/**
 * Send a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info { page, limit, total }
 * @param {string} message - Optional message
 */
function sendPaginated(res, data, pagination, message = null) {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  
  return res.status(200).json({
    success: true,
    data,
    error: null,
    message,
    meta: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
}

/**
 * Send a validation error response (422)
 * @param {Object} res - Express response object
 * @param {Array|string} errors - Validation errors
 */
function sendValidationError(res, errors) {
  return res.status(422).json({
    success: false,
    data: null,
    error: 'Validation failed',
    message: null,
    validationErrors: Array.isArray(errors) ? errors : [errors]
  });
}

/**
 * Wrap async route handlers to catch errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  sendPaginated,
  sendValidationError,
  asyncHandler
};
