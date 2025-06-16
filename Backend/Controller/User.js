/**
 * Module dependencies and Redis client initialization.
 *
 * This module:
 * - Imports required dependencies for Express, Redis, and custom services.
 * - Creates and connects a Redis client for use across the application.
 * - Loads OTP generation and email sending utility functions.
 *
 * @module Setup
 *
 * @requires express - The Express framework for HTTP server handling.
 * @requires redis.createClient - Used to initialize a Redis client.
 * @requires ../Services/otp.otpgenrater - Custom OTP generation function.
 * @requires ../Services/email.emailsender - Custom function to send email via nodemailer.
 *
 * @const {RedisClient} client - A Redis client instance created using `createClient()`.
 *                               Automatically attempts to connect on load.
 *
 * @throws Logs an error if Redis connection fails.
 */
const express = require('express');
const {createClient} = require('redis');
const client = createClient();
const {otpgenrater} = require('../Services/otp');
const {emailsender} = require('../Services/email');
client.connect().catch(console.error);
const Login = (req , res)=> {
    try{
    }catch(err){
        console.log(err);
    }
}
/**
 * @function signup
 * @description
 * Handles the first step of user registration. It validates user input, generates an OTP,
 * sends the OTP to the user's email, and temporarily stores the user's data in Redis for verification.
 *
 * This function does NOT save the user to the main database. It only prepares and stores
 * the necessary data until OTP verification is complete.
 *
 * @async
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request payload containing user signup data.
 * @param {string} req.body.name - User's full name.
 * @param {string} req.body.email - User's email address (must contain "@ac.in").
 * @param {string} req.body.university_name - Name of the user's university.
 * @param {string} req.body.domain - User's domain or department.
 * @param {string} req.body.password - User's password (should be hashed before saving to DB).
 *
 * @param {Object} res - Express response object.
 *
 * @returns {void} Sends a response with HTTP 400 for validation errors,
 * and HTTP 501 for unexpected server issues.
 *
 * @sideEffects
 * - Sends an OTP email to the provided address.
 * - Stores user data and OTP in Redis with a 10-minute expiration.
 *
 * @throws Will return HTTP 400 if required fields are missing or the email format is invalid.
 * Will return HTTP 501 if an unexpected server error occurs.
 */
const signup = async function(req,res){
    try{
        const {name , email , university_name  , password} = req.body;
        if(!name || !email || !university_name  || !password){
            return res.status(400).send({error: 'Please fill  all marked fields'});
        }
        if (!email.includes('@')){
            return res.status(400).send({error: 'Please enter a valid email'});
        }
        if (!email.includes('ac.in')){
            return res.status(400).send({error: 'Please enter an University email'});
        }
        const otp = otpgenrater();
        await emailsender(name , email , otp)
        await client.setEx(email, 600, JSON.stringify({ name, password, otp }))
    }catch(err){
        res.status(501).send({error: 'something went wrong'});
        console.log(err);
    }
}
module.exports = {Login , signup};