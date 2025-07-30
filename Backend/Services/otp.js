const {randomInt} = require('crypto');
function otpgenrater  (){
  const otp = randomInt(100000, 999999).toString();
  return otp;
}

function createOtpService() {
  return {
    generate() {
      return randomInt(100000, 999999).toString();
    }
  };
}

module.exports = { otpgenrater, createOtpService };