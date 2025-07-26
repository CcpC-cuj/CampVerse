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
            from: '"CampVerse" <noreply@campverse.com>',
            to: email,
            subject: "CampVerse - Email Verification OTP",
            text: `Hello ${name},\n\nYour verification OTP is: ${otp}\n\nThis OTP will expire in 10 minutes.\n\nBest regards,\nCampVerse Team`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">CampVerse Email Verification</h2>
                    <p>Hello <strong>${name}</strong>,</p>
                    <p>Your verification OTP is:</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
                    </div>
                    <p><strong>This OTP will expire in 10 minutes.</strong></p>
                    <p>If you didn't request this verification, please ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">Best regards,<br>CampVerse Team</p>
                </div>
            `
        });
}
module.exports = { emailsender };