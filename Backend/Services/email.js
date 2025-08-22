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
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

async function sendOTP(to, otp) {
  try {
    const transporter = createEmailTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Your OTP for CampVerse',
      html: `<p>Your verification code is: <b>${otp}</b></p>`,
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
      html: `<p>Hi ${name}, welcome to CampVerse!</p>`,
    });
    return true;
  } catch (e) {
    return false;
  }
}

// New email functions for feedback and support
async function sendFeedbackConfirmation(to, name, feedbackData) {
  try {
    const transporter = createEmailTransporter();
    const { rating, category, subject, ticketId } = feedbackData;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: 'Feedback Received - CampVerse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #9b5de5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Feedback Received</h1>
          </div>
          <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name},</p>
            <p>Thank you for your feedback! We've received your submission and our team will review it.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Feedback Details:</h3>
              <p><strong>Rating:</strong> ${'⭐'.repeat(rating)} (${rating}/5)</p>
              <p><strong>Category:</strong> ${category}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Reference ID:</strong> ${ticketId}</p>
            </div>
            
            <p>We appreciate you taking the time to help us improve CampVerse. We'll review your feedback and get back to you if needed.</p>
            
            <p>Best regards,<br>The CampVerse Team</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (e) {
    console.error('Feedback confirmation email failed:', e);
    return false;
  }
}

async function sendSupportTicketConfirmation(to, name, ticketData) {
  try {
    const transporter = createEmailTransporter();
    const { ticketId, topic, subject, priority } = ticketData;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: `Support Ticket Created - ${ticketId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #9b5de5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Support Ticket Created</h1>
          </div>
          <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name},</p>
            <p>Your support ticket has been created successfully. We'll get back to you as soon as possible.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Ticket Details:</h3>
              <p><strong>Ticket ID:</strong> ${ticketId}</p>
              <p><strong>Topic:</strong> ${topic}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Priority:</strong> <span style="color: ${priority === 'urgent' ? '#dc2626' : priority === 'high' ? '#ea580c' : priority === 'medium' ? '#ca8a04' : '#16a34a'}">${priority}</span></p>
            </div>
            
            <p>You can track the status of your ticket in your CampVerse dashboard. We'll also notify you via email when there are updates.</p>
            
            <p>Best regards,<br>The CampVerse Support Team</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (e) {
    console.error('Support ticket confirmation email failed:', e);
    return false;
  }
}

async function sendSupportTicketUpdate(to, name, ticketData) {
  try {
    const transporter = createEmailTransporter();
    const { ticketId, status, adminNotes, updatedBy } = ticketData;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject: `Support Ticket Update - ${ticketId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #9b5de5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">Ticket Update</h1>
          </div>
          <div style="background-color: white; padding: 20px; border-radius: 0 0 10px 10px;">
            <p>Hi ${name},</p>
            <p>Your support ticket has been updated by our team.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Update Details:</h3>
              <p><strong>Ticket ID:</strong> ${ticketId}</p>
              <p><strong>New Status:</strong> <span style="color: #9b5de5; font-weight: bold;">${status}</span></p>
              ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
              <p><strong>Updated By:</strong> ${updatedBy}</p>
            </div>
            
            <p>You can view the full details and respond to any questions in your CampVerse dashboard.</p>
            
            <p>Best regards,<br>The CampVerse Support Team</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (e) {
    console.error('Support ticket update email failed:', e);
    return false;
  }
}

function createEmailService() {
  const transporter = createEmailTransporter();
  return {
    sendMail: (options) => transporter.sendMail(options),
  };
}

module.exports = {
  createEmailTransporter,
  sendOTP,
  sendWelcomeEmail,
  sendFeedbackConfirmation,
  sendSupportTicketConfirmation,
  sendSupportTicketUpdate,
  createEmailService,
};
