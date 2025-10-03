/**
 * Comprehensive Security Middleware
 * Handles various security concerns and provides protection against common attacks
 */

const { logger } = require('./errorHandler');

// Redis client will be passed from the main app
let redisClient = null;

// Function to set Redis client
function setRedisClient(client) {
  redisClient = client;
}

/**
 * Brute force protection middleware
 */
function bruteForceProtection(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return async (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress;
      const endpoint = req.originalUrl;
      const key = `bruteforce:${identifier}:${endpoint}`;
      
      const attempts = await redisClient.get(key);
      const attemptCount = attempts ? parseInt(attempts) : 0;
      
      if (attemptCount >= maxAttempts) {
        logger.warn(`Brute force attempt blocked for ${identifier} on ${endpoint}`);
        return res.status(429).json({
          error: 'Too many failed attempts. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Increment attempt counter
      if (redisClient && redisClient.isOpen) {
        await redisClient.setEx(key, Math.ceil(windowMs / 1000), (attemptCount + 1).toString());
      }
      
      next();
    } catch (error) {
      logger.error('Brute force protection error:', error);
      next(); // Continue on error
    }
  };
}

/**
 * Request size validation middleware
 */
function requestSizeValidation(maxSize = '1mb') {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxSizeBytes = parseSize(maxSize);
    
    if (contentLength > maxSizeBytes) {
      logger.warn(`Request size exceeded: ${contentLength} bytes from ${req.ip}`);
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize
      });
    }
    
    next();
  };
}

/**
 * Parse size string to bytes
 */
function parseSize(size) {
  const units = { 'b': 1, 'kb': 1024, 'mb': 1024 * 1024, 'gb': 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);
  
  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    return value * units[unit];
  }
  
  return parseInt(size) || 1024 * 1024; // Default to 1MB
}

/**
 * SQL injection prevention middleware
 */
function sqlInjectionProtection(req, res, next) {
  const dangerousPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
    /(--|\/\*|\*\/|xp_|sp_|@@|char\(|nchar\(|varchar\(|nvarchar\(|cast\(|convert\(|declare\s+@)/i,
    /(\b(and|or)\s+\d+\s*=\s*\d+)/i,
    /(\b(and|or)\s+['"]\w+['"]\s*=\s*['"]\w+['"])/i
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          logger.warn(`Potential SQL injection attempt from ${req.ip}: ${value}`);
          return false;
        }
      }
    }
    return true;
  };
  
  const checkObject = (obj) => {
    for (const [, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        if (!checkObject(value)) return false;
      } else if (!checkValue(value)) {
        return false;
      }
    }
    return true;
  };
  
  // Check body, query, and params
  if (req.body && !checkObject(req.body)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  
  if (req.query && !checkObject(req.query)) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }
  
  if (req.params && !checkObject(req.params)) {
    return res.status(400).json({ error: 'Invalid path parameters' });
  }
  
  next();
}

/**
 * NoSQL injection prevention middleware
 */
function noSqlInjectionProtection(req, res, next) {
  const dangerousPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$gte/i,
    /\$lte/i,
    /\$in/i,
    /\$nin/i,
    /\$regex/i,
    /\$options/i,
    /\$text/i,
    /\$search/i
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          logger.warn(`Potential NoSQL injection attempt from ${req.ip}: ${value}`);
          return false;
        }
      }
    }
    return true;
  };
  
  const checkObject = (obj) => {
    for (const [, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        if (!checkObject(value)) return false;
      } else if (!checkValue(value)) {
        return false;
      }
    }
    return true;
  };
  
  // Check body, query, and params
  if (req.body && !checkObject(req.body)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  
  if (req.query && !checkObject(req.query)) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }
  
  if (req.params && !checkObject(req.params)) {
    return res.status(400).json({ error: 'Invalid path parameters' });
  }
  
  next();
}

/**
 * XSS protection middleware
 */
function xssProtection(req, res, next) {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi
  ];
  
  const checkValue = (value) => {
    if (typeof value === 'string') {
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          logger.warn(`Potential XSS attempt from ${req.ip}: ${value}`);
          return false;
        }
      }
    }
    return true;
  };
  
  const checkObject = (obj) => {
    for (const [, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        if (!checkObject(value)) return false;
      } else if (!checkValue(value)) {
        return false;
      }
    }
    return true;
  };
  
  // Check body, query, and params
  if (req.body && !checkObject(req.body)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  
  if (req.query && !checkObject(req.query)) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }
  
  if (req.params && !checkObject(req.params)) {
    return res.status(400).json({ error: 'Invalid path parameters' });
  }
  
  next();
}

/**
 * Security logging middleware
 */
function securityLogging(req, res, next) {
  const securityEvents = [];
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    { pattern: /\.\.\//, name: 'Path traversal attempt' },
    { pattern: /<script/i, name: 'XSS attempt' },
    { pattern: /union\s+select/i, name: 'SQL injection attempt' },
    { pattern: /\$where/i, name: 'NoSQL injection attempt' },
    { pattern: /eval\s*\(/i, name: 'Code injection attempt' },
    { pattern: /document\.cookie/i, name: 'Cookie theft attempt' }
  ];
  
  const checkValue = (value, source) => {
    if (typeof value === 'string') {
      for (const { pattern, name } of suspiciousPatterns) {
        if (pattern.test(value)) {
          securityEvents.push({
            type: name,
            source,
            value: value.substring(0, 100), // Truncate for logging
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  };
  
  const checkObject = (obj, source) => {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
        checkObject(value, `${source}.${key}`);
      } else {
        checkValue(value, `${source}.${key}`);
      }
    }
  };
  
  // Check all input sources
  if (req.body) checkObject(req.body, 'body');
  if (req.query) checkObject(req.query, 'query');
  if (req.params) checkObject(req.params, 'params');
  
  // Log security events
  if (securityEvents.length > 0) {
    logger.warn('Security events detected:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      events: securityEvents
    });
  }
  
  next();
}

/**
 * Rate limiting for security endpoints
 */
function securityRateLimit(windowMs = 15 * 60 * 1000, max = 5) {
  return async (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress;
      const endpoint = req.originalUrl;
      const key = `security:${identifier}:${endpoint}`;
      
      const attempts = await redisClient.get(key);
      const attemptCount = attempts ? parseInt(attempts) : 0;
      
      if (attemptCount >= max) {
        logger.warn(`Security rate limit exceeded for ${identifier} on ${endpoint}`);
        return res.status(429).json({
          error: 'Too many security-related requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Increment attempt counter
      if (redisClient && redisClient.isOpen) {
        await redisClient.setEx(key, Math.ceil(windowMs / 1000), (attemptCount + 1).toString());
      }
      
      next();
    } catch (error) {
      logger.error('Security rate limiting error:', error);
      next(); // Continue on error
    }
  };
}

/**
 * Comprehensive security middleware stack
 */
function securityMiddleware(options = {}) {
  const {
    enableBruteForceProtection = true,
    enableRequestSizeValidation = true,
    enableSqlInjectionProtection = true,
    enableNoSqlInjectionProtection = true,
    enableXssProtection = true,
    enableSecurityLogging = true,
    enableSecurityRateLimit = true,
    maxRequestSize = '1mb',
    bruteForceMaxAttempts = 5,
    bruteForceWindowMs = 15 * 60 * 1000,
    securityRateLimitWindowMs = 15 * 60 * 1000,
    securityRateLimitMax = 5
  } = options;
  
  const middleware = [];
  
  if (enableRequestSizeValidation) {
    middleware.push(requestSizeValidation(maxRequestSize));
  }
  
  if (enableSqlInjectionProtection) {
    middleware.push(sqlInjectionProtection);
  }
  
  if (enableNoSqlInjectionProtection) {
    middleware.push(noSqlInjectionProtection);
  }
  
  if (enableXssProtection) {
    middleware.push(xssProtection);
  }
  
  if (enableSecurityLogging) {
    middleware.push(securityLogging);
  }
  
  if (enableBruteForceProtection) {
    middleware.push(bruteForceProtection(bruteForceMaxAttempts, bruteForceWindowMs));
  }
  
  if (enableSecurityRateLimit) {
    middleware.push(securityRateLimit(securityRateLimitWindowMs, securityRateLimitMax));
  }
  
  return middleware;
}

module.exports = {
  bruteForceProtection,
  requestSizeValidation,
  sqlInjectionProtection,
  noSqlInjectionProtection,
  xssProtection,
  securityLogging,
  securityRateLimit,
  securityMiddleware,
  setRedisClient,
  parseSize
};
