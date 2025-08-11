const {randomInt} = require('crypto');
function otpgenrater  (){
  const otp = randomInt(100000, 999999).toString();
  return otp;
}

function createOtpService(redisClient = null) {
  return {
    async generate(key = null) {
      const code = randomInt(100000, 999999).toString();
      if (redisClient && key) {
        try {
          await redisClient.set(`otp:${key}`, code, { EX: 300 });
        } catch (e) {
          // ignore store failure in tests
        }
      }
      return code;
    },
    async verify(key, code) {
      if (!redisClient || !key) return false;
      const stored = await redisClient.get(`otp:${key}`);
      if (stored === code) {
        await redisClient.del(`otp:${key}`);
        return true;
      }
      return false;
    }
  };
}

module.exports = { otpgenrater, createOtpService };