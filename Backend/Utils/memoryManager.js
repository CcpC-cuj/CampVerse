/**
 * Memory Management Utilities
 * Handles memory cleanup and prevents memory leaks
 */

const { logger } = require('../Middleware/errorHandler');

class MemoryManager {
  constructor() {
    this.cleanupIntervals = new Map();
    this.memoryThreshold = 0.85; // 85% memory usage threshold
    this.monitoringInterval = null;
    this.globalObjects = new Map();
  }

  /**
   * Initialize memory monitoring
   */
  init() {
    // Monitor memory usage every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);

    // Clean up global objects every 5 minutes
    this.scheduleCleanup('globalObjects', () => {
      this.cleanupGlobalObjects();
    }, 5 * 60 * 1000);

    // Clean up expired QR scan results every 10 minutes
    this.scheduleCleanup('qrScanResults', () => {
      this.cleanupQrScanResults();
    }, 10 * 60 * 1000);

    // Clean up rate limit data every 15 minutes
    this.scheduleCleanup('rateLimitData', () => {
      this.cleanupRateLimitData();
    }, 15 * 60 * 1000);

    logger.info('Memory manager initialized');
  }

  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedMemory = memUsage.rss;
    const memoryPercentage = usedMemory / totalMemory;

    // Log memory stats
    logger.debug('Memory Usage:', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      percentage: `${Math.round(memoryPercentage * 100)}%`
    });

    // Trigger cleanup if memory usage is high
    if (memoryPercentage > this.memoryThreshold) {
      logger.warn(`High memory usage detected: ${Math.round(memoryPercentage * 100)}%`);
      this.forceCleanup();
    }
  }

  /**
   * Schedule periodic cleanup
   */
  scheduleCleanup(name, cleanupFunction, interval) {
    if (this.cleanupIntervals.has(name)) {
      clearInterval(this.cleanupIntervals.get(name));
    }

    const intervalId = setInterval(() => {
      try {
        cleanupFunction();
        logger.debug(`Cleanup completed: ${name}`);
      } catch (error) {
        logger.error(`Cleanup error for ${name}:`, error);
      }
    }, interval);

    this.cleanupIntervals.set(name, intervalId);
  }

  /**
   * Clean up global objects that may cause memory leaks
   */
  cleanupGlobalObjects() {
    try {
      // Clean up QR scan rate limiting
      if (global.scanRateLimit) {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, timestamp] of Object.entries(global.scanRateLimit)) {
          if (now - timestamp > 60000) { // 1 minute expiry
            expiredKeys.push(key);
          }
        }
        
        expiredKeys.forEach(key => {
          try {
            delete global.scanRateLimit[key];
          } catch (err) {
            logger.error(`Failed to delete scan rate limit key ${key}:`, err);
          }
        });
        
        if (expiredKeys.length > 0) {
          logger.debug(`Cleaned up ${expiredKeys.length} expired QR scan rate limit entries`);
        }
      }

      // Clean up any other global objects
      this.globalObjects.forEach((value, key) => {
        try {
          if (value.expiry && Date.now() > value.expiry) {
            this.globalObjects.delete(key);
            logger.debug(`Cleaned up expired global object: ${key}`);
          }
        } catch (err) {
          logger.error(`Error cleaning up global object ${key}:`, err);
          // Remove problematic objects
          this.globalObjects.delete(key);
        }
      });

      // Clean up any other potential global objects
      const globalKeys = Object.keys(global);
      const suspiciousKeys = globalKeys.filter(key => 
        key.includes('temp') || 
        key.includes('cache') || 
        key.includes('rateLimit') ||
        key.includes('session')
      );

      suspiciousKeys.forEach(key => {
        try {
          if (global[key] && typeof global[key] === 'object') {
            const obj = global[key];
            if (obj.timestamp && Date.now() - obj.timestamp > 300000) { // 5 minutes
              delete global[key];
              logger.debug(`Cleaned up suspicious global object: ${key}`);
            }
          }
        } catch (err) {
          logger.error(`Error cleaning up suspicious global object ${key}:`, err);
        }
      });
    } catch (error) {
      logger.error('Error in global objects cleanup:', error);
    }
  }

  /**
   * Clean up QR scan results
   */
  cleanupQrScanResults() {
    // This would clean up any QR scan result caches
    // Implementation depends on how QR results are stored
    if (global.qrScanResults) {
      const now = Date.now();
      const expiredKeys = [];
      
      for (const [key, data] of Object.entries(global.qrScanResults)) {
        if (data.timestamp && now - data.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => delete global.qrScanResults[key]);
      
      if (expiredKeys.length > 0) {
        logger.debug(`Cleaned up ${expiredKeys.length} expired QR scan results`);
      }
    }
  }

  /**
   * Clean up rate limit data
   */
  cleanupRateLimitData() {
    // Clean up any in-memory rate limit data
    if (global.rateLimitData) {
      const now = Date.now();
      const expiredKeys = [];
      
      for (const [key, data] of Object.entries(global.rateLimitData)) {
        if (data.resetTime && now > data.resetTime) {
          expiredKeys.push(key);
        }
      }
      
      expiredKeys.forEach(key => delete global.rateLimitData[key]);
      
      if (expiredKeys.length > 0) {
        logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
      }
    }
  }

  /**
   * Force garbage collection and cleanup
   */
  forceCleanup() {
    logger.info('Forcing memory cleanup due to high usage');
    
    // Run all cleanup functions immediately
    this.cleanupGlobalObjects();
    this.cleanupQrScanResults();
    this.cleanupRateLimitData();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.info('Forced garbage collection completed');
    } else {
      logger.warn('Garbage collection not available. Start Node.js with --expose-gc flag');
    }
  }

  /**
   * Set a global object with automatic cleanup
   */
  setGlobalObject(key, value, ttl = 60000) {
    this.globalObjects.set(key, {
      value,
      expiry: Date.now() + ttl,
      createdAt: Date.now()
    });
  }

  /**
   * Get a global object
   */
  getGlobalObject(key) {
    const obj = this.globalObjects.get(key);
    if (!obj) return null;
    
    if (Date.now() > obj.expiry) {
      this.globalObjects.delete(key);
      return null;
    }
    
    return obj.value;
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    
    return {
      process: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      system: {
        total: totalMemory,
        free: freeMemory,
        used: totalMemory - freeMemory,
        percentage: ((totalMemory - freeMemory) / totalMemory) * 100
      },
      globalObjects: this.globalObjects.size,
      cleanupIntervals: this.cleanupIntervals.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create a memory-safe timeout
   */
  createSafeTimeout(callback, delay, ...args) {
    const timeoutId = setTimeout(() => {
      try {
        callback(...args);
      } catch (error) {
        logger.error('Safe timeout callback error:', error);
      }
    }, delay);
    
    return timeoutId;
  }

  /**
   * Create a memory-safe interval
   */
  createSafeInterval(callback, interval, ...args) {
    const intervalId = setInterval(() => {
      try {
        callback(...args);
      } catch (error) {
        logger.error('Safe interval callback error:', error);
      }
    }, interval);
    
    return intervalId;
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    logger.info('Shutting down memory manager');
    
    // Clear monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Clear all cleanup intervals
    this.cleanupIntervals.forEach((intervalId, name) => {
      clearInterval(intervalId);
      logger.debug(`Cleared cleanup interval: ${name}`);
    });
    
    this.cleanupIntervals.clear();
    
    // Final cleanup
    this.forceCleanup();
    
    // Clear global objects
    this.globalObjects.clear();
    
    logger.info('Memory manager shutdown completed');
  }
}

// Utility functions for memory management
const memoryUtils = {
  /**
   * Convert bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))  } ${  sizes[i]}`;
  },

  /**
   * Deep clone object safely
   */
  safeClone(obj) {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      logger.error('Safe clone error:', error);
      return null;
    }
  },

  /**
   * Check if object is empty
   */
  isEmpty(obj) {
    if (obj == null) return true;
    if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
    return Object.keys(obj).length === 0;
  },

  /**
   * Safely delete object properties
   */
  safeDelete(obj, ...keys) {
    if (!obj || typeof obj !== 'object') return;
    
    keys.forEach(key => {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        delete obj[key];
      }
    });
  },

  /**
   * Create a weak reference map for caching
   */
  createWeakCache() {
    return new WeakMap();
  },

  /**
   * Throttle function execution to prevent memory buildup
   */
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Debounce function execution
   */
  debounce(func, wait, immediate) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      const later = function() {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }
};

// Create singleton instance
const memoryManager = new MemoryManager();

module.exports = {
  memoryManager,
  memoryUtils
};