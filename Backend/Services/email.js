/**
 * @function emailsender
 * @description
 * Sends an OTP email to the specified user using Gmail via Nodemailer.
 *
 * This function uses environment variables (`email`, `EMAIL_PASSWORD`) to authenticate
 * with the Gmail SMTP server. It constructs a simple HTML and plain-text email
 * that includes a verification message or OTP (if added).
 *
 * @async
 * @param {string} name - The name of the recipient user.
 * @param {string} email - The recipient's email address.
 * @param {string} otp - The one-time password to include in the email.
 *
 * @returns {Promise<void>} - Resolves after email is successfully sent.
 *
 * @throws Will throw an error if email sending fails (e.g., bad credentials, network issues).
 *
 * @requires nodemailer
 * @requires dotenv - To load environment variables from .env file.
 * @requires process.env.email - Sender's Gmail address.
 * @requires process.env.EMAIL_PASSWORD - Gmail app password.
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
async function emailsender(name , email , otp){
    const transporter = nodemailer.createTransport({
            service: "gmail",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.email,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
// Wrap in an async IIFE so we can use await.
        const info = await transporter.sendMail({
            from: '"CampVerse"',
            to: email,
            subject: "Hello ✔",
            text: "Hello world?", // plain‑text body
            html: "<b>Hello world?</b>", // HTML body
        });
}
module.exports = { emailsender };