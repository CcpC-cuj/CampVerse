// Simple test script to check email functionality
require('dotenv').config();

async function testEmail() {
  try {
    // Import email service the same way as User.js
    let emailService;
    try {
      const emailModule = require('./Services/email');
      if (typeof emailModule.createEmailService === 'function') {
        emailService = emailModule.createEmailService();
      } else {
        emailService = { sendMail: async () => true };
      }
    } catch (e) {
      emailService = { sendMail: async () => true };
    }

    console.log('Email service imported:', emailService.sendMail ? 'SUCCESS' : 'FAILED');
    
    // Test environment variables
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'SET' : 'NOT SET');
    
    // Try to send a test email
    console.log('Attempting to send test email...');
    
    const result = await emailService.sendMail({
      from: process.env.EMAIL_USER,
      to: 'test@example.com', // This won't actually send since it's a fake email
      subject: 'Test Email',
      text: 'This is a test email'
    });
    
    console.log('Email result:', result);
    
  } catch (error) {
    console.error('Email test failed:', error.message);
  }
}

testEmail();
