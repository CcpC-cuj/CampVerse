const {randomInt} = require("crypto");
function otpgenrater  (){
    const otp = randomInt(100000, 999999).toString();
    return otp;
}
module.exports = {otpgenrater};