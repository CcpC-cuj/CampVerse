// Seed script for CampVerse backend
const mongoose = require('mongoose');
const User = require('../Models/User');
const Event = require('../Models/Event');
const Institution = require('../Models/Institution');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campverse');
  // Clear collections
  await User.deleteMany({});
  await Event.deleteMany({});
  await Institution.deleteMany({});

  // Create institution
  const institution = await Institution.create({
    name: 'Test University',
    type: 'university',
    emailDomain: 'test.edu.in',
    isVerified: true,
    isTemporary: false,
    location: { city: 'Test City', state: 'Test State', country: 'Testland' }
  });

  // Create users
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@test.edu.in',
    phone: '1111111111',
    passwordHash: 'test',
    roles: ['platformAdmin'],
    institutionId: institution._id,
    isVerified: true
  });
  const host = await User.create({
    name: 'Host',
    email: 'host@test.edu.in',
    phone: '2222222222',
    passwordHash: 'test',
    roles: ['host'],
    institutionId: institution._id,
    isVerified: true
  });
  const student = await User.create({
    name: 'Student',
    email: 'student@test.edu.in',
    phone: '3333333333',
    passwordHash: 'test',
    roles: ['student'],
    institutionId: institution._id,
    isVerified: true
  });

  // Create event
  const event = await Event.create({
    title: 'Test Event',
    description: 'A test event',
    tags: ['workshop'],
    type: 'workshop',
    organizer: 'Test Club',
    schedule: { start: new Date(), end: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    hostUserId: host._id,
    institutionId: institution._id,
    capacity: 2,
    verificationStatus: 'approved'
  });

  console.log('Seed data created.');
  process.exit(0);
}

seed(); 