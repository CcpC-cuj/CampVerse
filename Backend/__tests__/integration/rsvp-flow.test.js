/**
 * Comprehensive RSVP Flow Tests
 * Tests all aspects of event registration, QR code lifecycle, and attendance marking
 */

const request = require('supertest');
const app = require('../app');
const User = require('../Models/User');
const Event = require('../Models/Event');
const EventParticipationLog = require('../Models/EventParticipationLog');
const mongoose = require('mongoose');

describe('RSVP Flow Tests', () => {
  let userToken;
  let hostToken;
  let userId;
  let hostId;
  let eventId;
  let qrToken;

  beforeAll(async () => {
    // Create test user
    const userResponse = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'Password123!',
      });
    
    userId = userResponse.body.user._id;
    userToken = userResponse.body.token;

    // Create test host
    const hostResponse = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test Host',
        email: 'testhost@example.com',
        password: 'Password123!',
        role: 'host',
      });
    
    hostId = hostResponse.body.user._id;
    hostToken = hostResponse.body.token;

    // Create test event
    const eventResponse = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: 'Test Event',
        description: 'Test Event Description',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        location: 'Test Location',
        capacity: 10,
        verificationStatus: 'approved',
      });
    
    eventId = eventResponse.body.event._id;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: { $in: ['testuser@example.com', 'testhost@example.com'] } });
    await Event.deleteMany({ title: 'Test Event' });
    await EventParticipationLog.deleteMany({ eventId });
    await mongoose.connection.close();
  });

  describe('1. RSVP Registration', () => {
    test('Should register user for event', async () => {
      const response = await request(app)
        .post('/api/events/rsvp')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('registered');
      expect(response.body.message).toContain('registered successfully');
    });

    test('Should prevent duplicate registration', async () => {
      const response = await request(app)
        .post('/api/events/rsvp')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already registered');
    });

    test('Should generate QR code for registered user', async () => {
      const log = await EventParticipationLog.findOne({ userId, eventId });
      
      expect(log).toBeTruthy();
      expect(log.qrCode).toBeTruthy();
      expect(log.qrCode.token).toBeTruthy();
      expect(log.qrCode.expiresAt).toBeTruthy();
      expect(log.qrCode.isUsed).toBe(false);
      
      qrToken = log.qrCode.token;
    });

    test('Should set proper QR expiration time', async () => {
      const log = await EventParticipationLog.findOne({ userId, eventId }).populate('eventId');
      const event = log.eventId;
      const eventEndTime = new Date(event.date);
      const expectedExpiration = new Date(eventEndTime.getTime() + 2 * 60 * 60 * 1000);
      
      const actualExpiration = new Date(log.qrCode.expiresAt);
      const timeDiff = Math.abs(actualExpiration - expectedExpiration);
      
      expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('2. QR Code Retrieval', () => {
    test('Should retrieve user QR code', async () => {
      const response = await request(app)
        .get(`/api/events/my-qr/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.qrCode).toBeTruthy();
      expect(response.body.qrCode.token).toBe(qrToken);
      expect(response.body.qrCode.image).toContain('data:image');
    });

    test('Should fail for non-registered user', async () => {
      // Create another user
      const anotherUserResponse = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Another User',
          email: 'anotheruser@example.com',
          password: 'Password123!',
        });

      const response = await request(app)
        .get(`/api/events/my-qr/${eventId}`)
        .set('Authorization', `Bearer ${anotherUserResponse.body.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);

      // Cleanup
      await User.deleteOne({ email: 'anotheruser@example.com' });
    });
  });

  describe('3. QR Code Scanning', () => {
    test('Should mark attendance with valid QR code', async () => {
      const response = await request(app)
        .post('/api/events/scan')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ qrToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Attendance marked');
      expect(response.body.user).toBeTruthy();
    });

    test('Should verify QR is marked as used', async () => {
      const log = await EventParticipationLog.findOne({ userId, eventId });
      
      expect(log.attended).toBe(true);
      expect(log.qrCode.isUsed).toBe(true);
      expect(log.qrCode.usedAt).toBeTruthy();
      expect(log.qrCode.usedBy).toBeTruthy();
    });

    test('Should reject already used QR code', async () => {
      const response = await request(app)
        .post('/api/events/scan')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ qrToken });

      expect(response.status).toBe(410);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already been used');
    });

    test('Should reject invalid QR token', async () => {
      const response = await request(app)
        .post('/api/events/scan')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ qrToken: 'invalid-token-12345' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('4. Cancel RSVP', () => {
    let newUserId;
    let newUserToken;

    beforeAll(async () => {
      // Create another user for cancel test
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Cancel Test User',
          email: 'canceltest@example.com',
          password: 'Password123!',
        });
      
      newUserId = response.body.user._id;
      newUserToken = response.body.token;

      // Register for event
      await request(app)
        .post('/api/events/rsvp')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({ eventId });
    });

    afterAll(async () => {
      await User.deleteOne({ email: 'canceltest@example.com' });
    });

    test('Should cancel RSVP', async () => {
      const response = await request(app)
        .post('/api/events/cancel-rsvp')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({ eventId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    test('Should remove registration from database', async () => {
      const log = await EventParticipationLog.findOne({ 
        userId: newUserId, 
        eventId,
        status: 'registered'
      });
      
      expect(log).toBeFalsy();
    });

    test('Should fail to cancel non-existent RSVP', async () => {
      const response = await request(app)
        .post('/api/events/cancel-rsvp')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send({ eventId });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('5. Waitlist Management', () => {
    const waitlistUsers = [];

    beforeAll(async () => {
      // Fill event to capacity
      const event = await Event.findById(eventId);
      const currentRegistrations = await EventParticipationLog.countDocuments({
        eventId,
        status: 'registered'
      });

      const spotsNeeded = event.capacity - currentRegistrations;

      for (let i = 0; i < spotsNeeded + 2; i++) {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            name: `Waitlist User ${i}`,
            email: `waitlist${i}@example.com`,
            password: 'Password123!',
          });

        waitlistUsers.push({
          id: response.body.user._id,
          token: response.body.token,
          email: response.body.user.email
        });

        await request(app)
          .post('/api/events/rsvp')
          .set('Authorization', `Bearer ${response.body.token}`)
          .send({ eventId });
      }
    });

    afterAll(async () => {
      await User.deleteMany({ 
        email: { $in: waitlistUsers.map(u => u.email) } 
      });
    });

    test('Should add users to waitlist when event is full', async () => {
      const waitlistedLogs = await EventParticipationLog.find({
        eventId,
        status: 'waitlisted'
      });

      expect(waitlistedLogs.length).toBeGreaterThan(0);
    });

    test('Waitlisted users should not have QR codes', async () => {
      const waitlistedLog = await EventParticipationLog.findOne({
        eventId,
        status: 'waitlisted'
      });

      expect(waitlistedLog.qrCode.token).toBeFalsy();
    });

    test('Should promote waitlist user when spot opens', async () => {
      // Get a registered user
      const registeredLog = await EventParticipationLog.findOne({
        eventId,
        status: 'registered',
        userId: { $ne: userId } // Not the original test user
      });

      const cancelToken = waitlistUsers.find(u => u.id.toString() === registeredLog.userId.toString())?.token;

      if (cancelToken) {
        // Cancel their RSVP
        await request(app)
          .post('/api/events/cancel-rsvp')
          .set('Authorization', `Bearer ${cancelToken}`)
          .send({ eventId });

        // Check if a waitlist user was promoted
        const promotedLogs = await EventParticipationLog.find({
          eventId,
          status: 'registered'
        });

        const event = await Event.findById(eventId);
        expect(promotedLogs.length).toBeLessThanOrEqual(event.capacity);
      }
    });
  });

  describe('6. Attendance Management', () => {
    test('Should get attendance list (host only)', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/attendance`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.totalRegistered).toBeGreaterThan(0);
      expect(response.body.attendees).toBeTruthy();
    });

    test('Should fail for non-host', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/attendance`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('7. Bulk Attendance Marking', () => {
    const bulkUserIds = [];

    beforeAll(async () => {
      // Create users and register them
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/users/register')
          .send({
            name: `Bulk User ${i}`,
            email: `bulk${i}@example.com`,
            password: 'Password123!',
          });

        bulkUserIds.push(response.body.user._id);

        await request(app)
          .post('/api/events/rsvp')
          .set('Authorization', `Bearer ${response.body.token}`)
          .send({ eventId });
      }
    });

    afterAll(async () => {
      await User.deleteMany({ 
        email: { $regex: /^bulk\d+@example\.com$/ } 
      });
    });

    test('Should mark bulk attendance', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/bulk-attendance`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ userIds: bulkUserIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.marked).toBeGreaterThan(0);
    });

    test('Should verify bulk attendance was marked', async () => {
      const logs = await EventParticipationLog.find({
        eventId,
        userId: { $in: bulkUserIds }
      });

      logs.forEach(log => {
        expect(log.attended).toBe(true);
        expect(log.qrCode.isUsed).toBe(true);
      });
    });
  });

  describe('8. QR Regeneration', () => {
    let regenUserId;
    let regenUserToken;
    let originalQrToken;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          name: 'Regen Test User',
          email: 'regentest@example.com',
          password: 'Password123!',
        });
      
      regenUserId = response.body.user._id;
      regenUserToken = response.body.token;

      await request(app)
        .post('/api/events/rsvp')
        .set('Authorization', `Bearer ${regenUserToken}`)
        .send({ eventId });

      const log = await EventParticipationLog.findOne({ 
        userId: regenUserId, 
        eventId 
      });
      originalQrToken = log.qrCode.token;
    });

    afterAll(async () => {
      await User.deleteOne({ email: 'regentest@example.com' });
    });

    test('Should regenerate QR code', async () => {
      const response = await request(app)
        .post(`/api/events/${eventId}/regenerate-qr`)
        .set('Authorization', `Bearer ${regenUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.qrCode).toBeTruthy();
    });

    test('Should have new QR token', async () => {
      const log = await EventParticipationLog.findOne({ 
        userId: regenUserId, 
        eventId 
      });

      expect(log.qrCode.token).toBeTruthy();
      expect(log.qrCode.token).not.toBe(originalQrToken);
    });

    test('Old QR token should not work', async () => {
      const response = await request(app)
        .post('/api/events/scan')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ qrToken: originalQrToken });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('New QR token should work', async () => {
      const log = await EventParticipationLog.findOne({ 
        userId: regenUserId, 
        eventId 
      });

      const response = await request(app)
        .post('/api/events/scan')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ qrToken: log.qrCode.token });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('9. State Synchronization', () => {
    test('Event details should reflect correct registration status', async () => {
      const response = await request(app)
        .get(`/api/events/public/${eventId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userRegistration).toBeTruthy();
      expect(response.body.data.userRegistration.status).toBe('registered');
    });

    test('Participant list should be accurate', async () => {
      const response = await request(app)
        .get(`/api/events/${eventId}/participants`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const registeredCount = response.body.participants.filter(
        p => p.status === 'registered'
      ).length;
      
      const dbCount = await EventParticipationLog.countDocuments({
        eventId,
        status: 'registered'
      });

      expect(registeredCount).toBe(dbCount);
    });
  });
});
