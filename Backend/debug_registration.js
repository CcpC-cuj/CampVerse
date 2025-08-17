// Test script to debug the registration issue
require('dotenv').config();

// Test academic email validation
const isAcademicEmail = (email) =>
  /@[\w.-]+\.(ac|edu)\.in$/i.test(email) || /@[\w.-]+\.edu$/i.test(email);

console.log('=== EMAIL VALIDATION TEST ===');
const testEmails = [
  'krish@cuj.ac.in',
  'krish.22190503027@cuj.ac.in',
  'test@gmail.com',
  'student@university.edu.in',
  'user@college.ac.in'
];

testEmails.forEach(email => {
  console.log(`${email}: ${isAcademicEmail(email) ? 'VALID' : 'INVALID'}`);
});

console.log('\n=== ENVIRONMENT VARIABLES TEST ===');
const requiredVars = ['MONGO_URI', 'REDIS_URL', 'JWT_SECRET'];
requiredVars.forEach(varName => {
  const value = process.env[varName];
  console.log(`${varName}: ${value ? 'SET' : 'NOT SET'}`);
});

console.log('\n=== VALIDATION FUNCTIONS TEST ===');
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function validateName(name) {
  return name && name.trim().length >= 2;
}

const testData = {
  name: "krish",
  email: "krish.22190503027@cuj.ac.in",
  phone: "9661611105",
  password: "1234567890"
};

console.log('Name validation:', validateName(testData.name));
console.log('Email validation:', validateEmail(testData.email));
console.log('Academic email validation:', isAcademicEmail(testData.email));
console.log('Phone validation:', validatePhone(testData.phone));
console.log('Password validation:', validatePassword(testData.password));
