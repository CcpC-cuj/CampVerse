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

function createEmailService() {
  const transporter = require('nodemailer').createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  return {
    async sendMail(options) {
      return transporter.sendMail(options);
    }
  };
}

module.exports = { createEmailService };