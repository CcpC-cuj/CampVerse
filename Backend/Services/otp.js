import {randomInt} from "crypto";
const express = require('express');
const otpgenrater = ()=>{
    const otp = randomInt(100000, 999999).toString();
    return otp;
}
module.exports = {otpgenrater};