const {randomInt} = require('crypto');
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

function otpgenrater(){
  const otp = randomInt(100000, 999999).toString();
  return otp;
}

function createOtpService() {
  return {
    generate() {
      return randomInt(100000, 999999).toString();
    },
    
    async generateOtp(email) {
      const otp = randomInt(100000, 999999).toString();
      // Store OTP in Redis with 10 minute expiry
      await redisClient.setEx(`otp:${email}`, 600, otp);
      return otp;
    },
    
    async verifyOtp(email, otp) {
      const storedOtp = await redisClient.get(`otp:${email}`);
      if (!storedOtp) {
        return false; // OTP expired or doesn't exist
      }
      
      if (storedOtp === otp) {
        // Delete OTP after successful verification
        await redisClient.del(`otp:${email}`);
        return true;
      }
      
      return false;
    }
  };
}

module.exports = { otpgenrater, createOtpService };