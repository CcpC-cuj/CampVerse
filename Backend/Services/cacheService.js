/**
 * Redis Caching Service
 * Provides centralized caching functionality with TTL and invalidation
 */

const { createClient } = require('redis');
const { logger } = require('../Middleware/errorHandler');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5 minutes
    this.keyPrefix = 'campverse:';
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            logger.error('Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            logger.error('Redis max retry attempts reached');
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Generate cache key with prefix
   */
  _generateKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const cacheKey = this._generateKey(key);
      const value = await this.client.get(cacheKey);
      
      if (value) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return false;

    try {
      const cacheKey = this._generateKey(key);
      const serializedValue = JSON.stringify(value);
      
      await this.client.setEx(cacheKey, ttl, serializedValue);
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    if (!this.isConnected) return false;

    try {
      const cacheKey = this._generateKey(key);
      const result = await this.client.del(cacheKey);
      logger.debug(`Cache delete for key: ${key}`);
      return result > 0;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const searchPattern = this._generateKey(pattern);
      const keys = await this.client.keys(searchPattern);
      
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.debug(`Cache pattern delete: ${pattern}, ${keys.length} keys deleted`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Cache pattern delete error for pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isConnected) return false;

    try {
      const cacheKey = this._generateKey(key);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key, ttl = this.defaultTTL) {
    if (!this.isConnected) return null;

    try {
      const cacheKey = this._generateKey(key);
      const value = await this.client.incr(cacheKey);
      
      if (value === 1) {
        // Set TTL only for new keys
        await this.client.expire(cacheKey, ttl);
      }
      
      return value;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
    // Try to get from cache first
    const cachedValue = await this.get(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    try {
      // Execute function to get fresh data
      const freshValue = await fetchFunction();
      
      // Cache the result
      await this.set(key, freshValue, ttl);
      
      return freshValue;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Cache invalidation patterns
   */
  async invalidateUser(userId) {
    await this.delPattern(`user:${userId}:*`);
    await this.delPattern(`dashboard:user:${userId}`);
  }

  async invalidateInstitution(institutionId) {
    await this.delPattern(`institution:${institutionId}:*`);
    await this.delPattern(`dashboard:institution:${institutionId}`);
    await this.delPattern(`institutions:*`);
  }

  async invalidateEvent(eventId) {
    await this.delPattern(`event:${eventId}:*`);
    await this.delPattern(`events:*`);
    await this.delPattern(`recommendations:*`);
  }

  async invalidateGlobal() {
    await this.delPattern(`events:*`);
    await this.delPattern(`institutions:*`);
    await this.delPattern(`analytics:*`);
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isConnected) return false;

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isConnected) return null;

    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Flush all cache (use with caution)
   */
  async flushAll() {
    if (!this.isConnected) return false;

    try {
      await this.client.flushAll();
      logger.warn('Cache flushed - all keys deleted');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Close connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }
}

// Cache key generators for consistency
const CacheKeys = {
  user: (userId) => `user:${userId}`,
  userDashboard: (userId) => `dashboard:user:${userId}`,
  userEvents: (userId) => `user:${userId}:events`,
  userCertificates: (userId) => `user:${userId}:certificates`,
  
  institution: (institutionId) => `institution:${institutionId}`,
  institutionDashboard: (institutionId) => `dashboard:institution:${institutionId}`,
  institutionEvents: (institutionId) => `institution:${institutionId}:events`,
  institutionUsers: (institutionId) => `institution:${institutionId}:users`,
  
  event: (eventId) => `event:${eventId}`,
  eventParticipants: (eventId) => `event:${eventId}:participants`,
  eventAnalytics: (eventId) => `event:${eventId}:analytics`,
  
  events: (filters = '') => `events:${filters}`,
  institutions: (filters = '') => `institutions:${filters}`,
  
  recommendations: (userId) => `recommendations:${userId}`,
  analytics: (type, id = '') => `analytics:${type}:${id}`,
  
  rateLimit: (ip, endpoint) => `ratelimit:${ip}:${endpoint}`,
  session: (sessionId) => `session:${sessionId}`,
};

// TTL constants (in seconds)
const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  VERY_LONG: 3600,  // 1 hour
  DAY: 86400,       // 24 hours
};

// Create singleton instance
const cacheService = new CacheService();

module.exports = {
  cacheService,
  CacheKeys,
  CacheTTL
};