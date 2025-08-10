const dotenv = require('dotenv');
dotenv.config();

const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email configuration...');
  console.log('EMAIL_USER:', process.env.EMAIL_USER);
  console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' : 'NOT SET');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    console.log('Attempting to send test email...');
    
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'krish.22190503027@cuj.ac.in',
      subject: 'Test Email from CampVerse',
      text: 'This is a test email to verify the email service is working.',
      html: '<h1>Test Email</h1><p>This is a test email to verify the email service is working.</p>'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ Email sending failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔐 Authentication failed. Please check:');
      console.error('1. Gmail 2FA is enabled');
      console.error('2. App password is correct');
      console.error('3. Less secure app access is disabled');
    }
  }
}

testEmail(); 