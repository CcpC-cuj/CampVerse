#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps developers set up their local environment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

// Generate secure random string
const generateSecureString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Check if .env file exists
const checkEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env');
  return fs.existsSync(envPath);
};

// Create .env file from template
const createEnvFile = () => {
  const envPath = path.join(__dirname, '..', '.env');
  const examplePath = path.join(__dirname, '..', '.env.example');
  
  if (fs.existsSync(examplePath)) {
    const template = fs.readFileSync(examplePath, 'utf8');
    const envContent = template
      .replace('your_very_secure_jwt_secret_key_here_at_least_32_characters_long', generateSecureString(32))
      .replace('your_email@example.com', 'dev@campverse.local')
      .replace('your_app_specific_password', 'dev-password-123')
      .replace('your_google_client_id_here', 'dev-google-client-id')
      .replace('your_ml_api_key_here', 'dev-ml-api-key')
      .replace('https://ml-certificate-api.example.com', 'https://dev-ml-api.example.com')
      .replace('http://localhost:3000', 'http://localhost:3000')
      .replace('http://localhost:5001', 'http://localhost:5001')
      .replace('your-firebase-bucket.appspot.com', 'dev-firebase-bucket.appspot.com');
    
    fs.writeFileSync(envPath, envContent);
    log('✅ Created .env file from template', colors.green);
    return true;
  } else {
    log('❌ .env.example template not found', colors.red);
    return false;
  }
};

// Validate environment variables
const validateEnv = () => {
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found', colors.red);
    return false;
  }
  
  // Load environment variables
  require('dotenv').config({ path: envPath });
  
  const requiredVars = [
    'JWT_SECRET',
    'MONGO_URI',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    log(`❌ Missing required environment variables: ${missing.join(', ')}`, colors.red);
    return false;
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    log('⚠️  JWT_SECRET is too short (minimum 32 characters)', colors.yellow);
  }
  
  log('✅ Environment variables validated', colors.green);
  return true;
};

// Main setup function
const setupEnvironment = () => {
  log(`${colors.bold}${colors.cyan}🔧 CampVerse Environment Setup${colors.reset}\n`);
  
  // Check if .env already exists
  if (checkEnvFile()) {
    log('📁 .env file already exists', colors.blue);
    
    if (validateEnv()) {
      log('✅ Environment is properly configured', colors.green);
      return;
    } else {
      log('❌ Environment validation failed', colors.red);
      log('💡 Consider running: npm run setup:env', colors.yellow);
      return;
    }
  }
  
  // Create .env file
  log('📝 Creating .env file...', colors.blue);
  
  if (createEnvFile()) {
    log('✅ Environment setup completed!', colors.green);
    log('\n📋 Next steps:', colors.cyan);
    log('1. Review and update the .env file with your actual values', colors.reset);
    log('2. Set up your database connection', colors.reset);
    log('3. Configure your email service', colors.reset);
    log('4. Run: npm run dev', colors.reset);
  } else {
    log('❌ Failed to create .env file', colors.red);
  }
};

// Run setup if called directly
if (require.main === module) {
  setupEnvironment();
}

module.exports = { setupEnvironment, validateEnv, createEnvFile };