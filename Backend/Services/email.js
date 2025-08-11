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
 * @requires process.env.EMAIL_USER - Sender's Gmail address.
 * @requires process.env.EMAIL_PASSWORD - Gmail app password.
 */
const dotenv = require('dotenv');
dotenv.config();
const nodemailer = require('nodemailer');

function createEmailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
}

async function sendOTP(to, otp) {
  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Your OTP for CampVerse',
      html: `<p>Your verification code is: <b>${otp}</b></p>`
    });
    return true;
  } catch (e) {
    return false;
  }
}

async function sendWelcomeEmail(to, name) {
  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Welcome to CampVerse!',
      html: `<p>Hi ${name}, welcome to CampVerse!</p>`
    });
    return true;
  } catch (e) {
    return false;
  }
}

function createEmailService() {
  const transporter = createEmailTransporter();
  return {
    sendMail: (options) => transporter.sendMail(options)
  };
}

module.exports = { createEmailTransporter, sendOTP, sendWelcomeEmail, createEmailService };