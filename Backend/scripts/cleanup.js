// Cleanup script for CampVerse backend
require('dotenv').config();
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

async function cleanupRedis() {
  try {
    await redisClient.connect();
    console.log('Connected to Redis for cleanup...');
    
    // Clean up old OTP data (older than 1 hour)
    const keys = await redisClient.keys('otp:*');
    let cleanedCount = 0;
    
    for (const key of keys) {
      const ttl = await redisClient.ttl(key);
      if (ttl === -1 || ttl > 3600) { // No expiry or older than 1 hour
        await redisClient.del(key);
        cleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${cleanedCount} expired OTP keys`);
    
    // Clean up old reset tokens (older than 2 hours)
    const resetKeys = await redisClient.keys('reset:*');
    let resetCleanedCount = 0;
    
    for (const key of resetKeys) {
      const ttl = await redisClient.ttl(key);
      if (ttl === -1 || ttl > 7200) { // No expiry or older than 2 hours
        await redisClient.del(key);
        resetCleanedCount++;
      }
    }
    
    console.log(`Cleaned up ${resetCleanedCount} expired reset tokens`);
    
    await redisClient.disconnect();
    console.log('Cleanup completed successfully');
    
  } catch (error) {
    console.error('Cleanup error:', error);
    process.exit(1);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupRedis();
}

module.exports = { cleanupRedis }; 