/**
 * Request Timeout Middleware
 * Handles request timeouts and prevents hanging requests
 */

const { logger } = require('./errorHandler');

/**
 * Create timeout middleware
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} message - Custom timeout message
 */
function createTimeoutMiddleware(timeout = 30000, message = 'Request timeout') {
  return (req, res, next) => {
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`Request timeout: ${req.method} ${req.url}`, {
          correlationId: req.correlationId,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          timeout
        });

        res.status(408).json({
          success: false,
          error: message,
          timeout,
          correlationId: req.correlationId,
          timestamp: new Date().toISOString()
        });
      }
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    // Clear timeout when response is closed
    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    // Store timeout ID for potential manual clearing
    req.timeoutId = timeoutId;

    next();
  };
}

/**
 * Different timeout configurations for different route types
 */
const timeoutConfigs = {
  // Quick operations (auth, simple queries)
  fast: createTimeoutMiddleware(5000, 'Request timeout - operation took too long'),
  
  // Standard operations (CRUD, most API calls)
  standard: createTimeoutMiddleware(15000, 'Request timeout - please try again'),
  
  // Slow operations (file uploads, complex queries)
  slow: createTimeoutMiddleware(30000, 'Request timeout - operation is taking longer than expected'),
  
  // Very slow operations (bulk operations, reports)
  bulk: createTimeoutMiddleware(60000, 'Request timeout - bulk operation exceeded time limit'),
  
  // File upload operations
  upload: createTimeoutMiddleware(120000, 'Upload timeout - file upload took too long'),
};

/**
 * Smart timeout middleware that adjusts based on request type
 */
function smartTimeout(req, res, next) {
  let timeout = 30000; // default
  let message = 'Request timeout';

  // Determine timeout based on request characteristics
  if (req.files || req.is('multipart/form-data')) {
    timeout = 120000; // 2 minutes for file uploads
    message = 'Upload timeout';
  } else if (req.url.includes('/bulk') || req.url.includes('/export')) {
    timeout = 60000; // 1 minute for bulk operations
    message = 'Bulk operation timeout';
  } else if (req.url.includes('/analytics') || req.url.includes('/dashboard')) {
    timeout = 30000; // 30 seconds for analytics
    message = 'Analytics timeout';
  } else if (req.method === 'GET' && req.url.includes('/search')) {
    timeout = 10000; // 10 seconds for search
    message = 'Search timeout';
  } else if (req.method === 'POST' && (req.url.includes('/login') || req.url.includes('/register'))) {
    timeout = 180000; // 3 minutes for auth (account for slow network/server)
    message = 'Authentication timeout';
  } else if (req.method === 'POST' && (req.url.includes('/forgot-password') || req.url.includes('/reset-password'))) {
    timeout = 180000; // 3 minutes for password reset emails (email sending can be slow)
    message = 'Password reset timeout';
  }

  // Apply the determined timeout
  return createTimeoutMiddleware(timeout, message)(req, res, next);
}

/**
 * Circuit breaker pattern for external service calls
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(operation, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        logger.warn('Circuit breaker is OPEN, using fallback');
        return fallback ? await fallback() : Promise.reject(new Error('Circuit breaker is OPEN'));
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.state = 'CLOSED';
          this.failureCount = 0;
          logger.info('Circuit breaker reset to CLOSED');
        }
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        logger.error(`Circuit breaker opened after ${this.failureCount} failures`);
      }
      
      if (fallback) {
        logger.warn('Operation failed, using fallback');
        return await fallback();
      }
      
      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    logger.info('Circuit breaker manually reset');
  }
}

/**
 * Retry mechanism with exponential backoff
 */
async function retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        logger.error(`Operation failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Request queue for managing concurrent requests
 */
class RequestQueue {
  constructor(maxConcurrent = 100) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  async add(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        operation,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { operation, resolve, reject } = this.queue.shift();

    try {
      const result = await operation();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // Process next item in queue
    }
  }

  getStats() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    };
  }

  clear() {
    this.queue.forEach(({ reject }) => {
      reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

// Create global instances
const mlApiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
  monitoringPeriod: 5000
});

const emailCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
  monitoringPeriod: 10000
});

const requestQueue = new RequestQueue(
  parseInt(process.env.REQUEST_QUEUE_CONCURRENCY || '10', 10)
);

/**
 * Middleware to add request to queue for rate limiting
 */
function queueMiddleware(req, res, next) {
  // Skip queueing for health checks and static files
  if (req.url === '/health' || req.url.startsWith('/api-docs')) {
    return next();
  }

  requestQueue.add(async () => {
    return new Promise((resolve) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      next();
    });
  }).catch(next);
}

module.exports = {
  // Timeout middlewares
  createTimeoutMiddleware,
  smartTimeout,
  timeoutConfigs,
  
  // Circuit breakers
  CircuitBreaker,
  mlApiCircuitBreaker,
  emailCircuitBreaker,
  
  // Retry mechanism
  retryWithBackoff,
  
  // Request queue
  RequestQueue,
  requestQueue,
  queueMiddleware
};