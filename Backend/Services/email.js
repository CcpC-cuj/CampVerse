/**
 * Email Service
 * Supports multiple providers:
 * 1. Brevo HTTP API (recommended for Hugging Face - uses port 443)
 * 2. Resend HTTP API (alternative)
 * 3. Nodemailer/Gmail SMTP (local development only - port 587 blocked on HF)
 */
const dotenv = require('dotenv');
dotenv.config();
const nodemailer = require('nodemailer');
const { logger } = require('../Middleware/errorHandler');

// Conditionally require Resend only if API key is available
let Resend = null;
let resend = null;

try {
  if (process.env.RESEND_API_KEY) {
    const resendModule = require('resend');
    Resend = resendModule.Resend;
    resend = new Resend(process.env.RESEND_API_KEY);
    logger.info('Resend email service initialized');
  }
} catch (err) {
  logger.warn('Resend module not installed, falling back to other providers');
}

// Determine which email provider to use (priority order)
const useBrevo = Boolean(process.env.BREVO_API_KEY);
const useResend = Boolean(resend && process.env.RESEND_API_KEY && !useBrevo);

const provider = useBrevo ? 'Brevo (HTTP API)' : useResend ? 'Resend (HTTP API)' : 'Nodemailer (SMTP)';

logger.info('Email service initialized:', {
  provider,
  hasBrevoKey: !!process.env.BREVO_API_KEY,
  hasResendKey: !!process.env.RESEND_API_KEY,
  hasEmailUser: !!process.env.EMAIL_USER,
  hasEmailPassword: !!process.env.EMAIL_PASSWORD
});

/**
 * Create Nodemailer transporter for SMTP
 * Used when no HTTP API is configured (local development only)
 */
function createEmailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

/**
 * Send email via Brevo HTTP API
 * Works on Hugging Face (uses port 443)
 */
async function sendViaBrevo({ to, subject, html, text, attachments = [] }) {
  // Format attachments for Brevo
  const formattedAttachments = attachments.map(att => ({
    content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
    name: att.filename || 'attachment'
  }));

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'CampVerse',
        email: process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'noreply@campverse.com'
      },
      to: [{ email: Array.isArray(to) ? to[0] : to }],
      subject,
      htmlContent: html,
      textContent: text,
      attachment: formattedAttachments.length > 0 ? formattedAttachments : undefined
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Brevo API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
  }

  const result = await response.json();
  return result;
}

/**
 * Universal email sending function
 * Priority: Brevo > Resend > Nodemailer
 */
async function sendEmail({ to, subject, html, text, attachments = [] }) {
  try {
    if (useBrevo) {
      // Use Brevo HTTP API (works on Hugging Face)
      const result = await sendViaBrevo({ to, subject, html, text, attachments });
      logger.info('Email sent via Brevo:', { messageId: result?.messageId, to });
      return true;
    } else if (useResend) {
      // Use Resend HTTP API
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'CampVerse <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content // Resend handles Buffers/strings
        }))
      });
      logger.info('Email sent via Resend:', { id: result?.data?.id, to });
      return true;
    } else {
      // Use Nodemailer (local development only - SMTP blocked on HF)
      const transporter = createEmailTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
        text,
        attachments
      });
      logger.info('Email sent via Nodemailer:', { to });
      return true;
    }
  } catch (error) {
    logger.error('Email sending failed:', {
      error: error.message,
      provider: useBrevo ? 'Brevo' : useResend ? 'Resend' : 'Nodemailer',
      to,
    });
    return false;
  }
}


/**
 * Send OTP email for verification
 */
async function sendOTP(to, otp) {
  return sendEmail({
    to,
    subject: 'Your OTP for CampVerse',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #9b5de5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Verification Code</h1>
        </div>
        <div style="background-color: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p>Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #9b5de5;">${otp}</span>
          </div>
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
        </div>
      </div>
    `,
    text: `Your verification code is: ${otp}. This code will expire in 10 minutes.`,
  });
}

/**
 * Send welcome email after successful registration
 */
async function sendWelcomeEmail(to, name) {
  return sendEmail({
    to,
    subject: 'Welcome to CampVerse!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #9b5de5; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Welcome to CampVerse!</h1>
        </div>
        <div style="background-color: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px;">
          <p>Hi ${name},</p>
          <p>Welcome to CampVerse! We're excited to have you on board.</p>
          <p>With CampVerse, you can:</p>
          <ul>
            <li>Discover and join campus events</li>
            <li>Host your own events</li>
            <li>Earn certificates and badges</li>
            <li>Connect with your campus community</li>
          </ul>
          <p>Start exploring events today!</p>
          <p>Best regards,<br>The CampVerse Team</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, welcome to CampVerse! We're excited to have you on board.`,
  });
}

/**
 * Send feedback confirmation email
 */
async function sendFeedbackConfirmation(to, name, feedbackData) {
  const { rating, category, subject, ticketId } = feedbackData;

  return sendEmail({
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
    text: `Hi ${name}, thank you for your feedback! Reference ID: ${ticketId}`,
  });
}

/**
 * Send support ticket confirmation email
 */
async function sendSupportTicketConfirmation(to, name, ticketData) {
  const { ticketId, topic, subject, priority } = ticketData;

  const priorityColor =
    priority === 'urgent'
      ? '#dc2626'
      : priority === 'high'
        ? '#ea580c'
        : priority === 'medium'
          ? '#ca8a04'
          : '#16a34a';

  return sendEmail({
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
            <p><strong>Priority:</strong> <span style="color: ${priorityColor}">${priority}</span></p>
          </div>
          
          <p>You can track the status of your ticket in your CampVerse dashboard. We'll also notify you via email when there are updates.</p>
          
          <p>Best regards,<br>The CampVerse Support Team</p>
        </div>
      </div>
    `,
    text: `Hi ${name}, your support ticket ${ticketId} has been created. Topic: ${topic}, Priority: ${priority}`,
  });
}

/**
 * Send support ticket update email
 */
async function sendSupportTicketUpdate(to, name, ticketData) {
  const { ticketId, status, adminNotes, updatedBy } = ticketData;

  return sendEmail({
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
    text: `Hi ${name}, your support ticket ${ticketId} has been updated. New status: ${status}`,
  });
}

/**
 * Create email service for direct use
 * Returns an object with sendMail method that routes through the appropriate provider
 */
function createEmailService() {
  // Always use the centralized sendEmail function which handles Brevo/Resend/Nodemailer
  return {
    sendMail: async (options) => {
      return sendEmail({
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
    },
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
  sendEmail,
  useResend,
};
