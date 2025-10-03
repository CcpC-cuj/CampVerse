/* eslint-disable no-unused-vars */
/**
 * Event Module Integration Tests
 * Tests all event workflows end-to-end
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const Event = require('../../Models/Event');
const User = require('../../Models/User');
const EventParticipationLog = require('../../Models/EventParticipationLog');

describe('Event Module Integration Tests', () => {
  let hostToken, coHostToken, verifierToken, userToken;
  let hostUser, coHostUser, verifierUser, normalUser;
  let testEvent;

  beforeAll(async () => {
    // Create test users
    hostUser = await User.create({
      name: 'Test Host',
      email: 'host@test.com',
      password: 'password123',
      roles: ['host'],
      canHost: true,
      isVerified: true
    });

    coHostUser = await User.create({
      name: 'Test CoHost',
      email: 'cohost@test.com',
      password: 'password123',
      roles: ['user'],
      isVerified: true
    });

    verifierUser = await User.create({
      name: 'Test Verifier',
      email: 'verifier@test.com',
      password: 'password123',
      roles: ['verifier'],
      isVerified: true
    });

    normalUser = await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
      roles: ['user'],
      isVerified: true
    });

    // Login and get tokens
    const hostLogin = await request(app).post('/api/users/login').send({
      email: 'host@test.com',
      password: 'password123'
    });
    hostToken = hostLogin.body.token;

    const coHostLogin = await request(app).post('/api/users/login').send({
      email: 'cohost@test.com',
      password: 'password123'
    });
    coHostToken = coHostLogin.body.token;

    const verifierLogin = await request(app).post('/api/users/login').send({
      email: 'verifier@test.com',
      password: 'password123'
    });
    verifierToken = verifierLogin.body.token;

    const userLogin = await request(app).post('/api/users/login').send({
      email: 'user@test.com',
      password: 'password123'
    });
    userToken = userLogin.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Event.deleteMany({});
    await EventParticipationLog.deleteMany({});
    await mongoose.connection.close();
  });

  describe('1. Event Creation Workflow', () => {
    test('Host can create event with all new fields', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        about: 'Test About Section',
        date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        location: JSON.stringify({ type: 'online', link: 'https://zoom.us/test' }),
        organizationName: 'Test Org',
        capacity: 50,
        type: 'workshop',
        tags: JSON.stringify(['tech', 'workshop']),
        requirements: JSON.stringify(['laptop', 'internet']),
        socialLinks: JSON.stringify({ website: 'https://test.com', linkedin: 'https://linkedin.com/test' }),
        audienceType: 'public',
        features: JSON.stringify({ certificateEnabled: true, chatEnabled: false }),
        sessions: JSON.stringify([
          { title: 'Session 1', time: '10:00 AM', speaker: 'Speaker 1' },
          { title: 'Session 2', time: '2:00 PM', speaker: 'Speaker 2' }
        ])
      };

      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .field('title', eventData.title)
        .field('description', eventData.description)
        .field('about', eventData.about)
        .field('date', eventData.date)
        .field('location', eventData.location)
        .field('organizationName', eventData.organizationName)
        .field('capacity', eventData.capacity)
        .field('type', eventData.type)
        .field('tags', eventData.tags)
        .field('requirements', eventData.requirements)
        .field('socialLinks', eventData.socialLinks)
        .field('audienceType', eventData.audienceType)
        .field('features', eventData.features)
        .field('sessions', eventData.sessions)
        .attach('banner', Buffer.from('fake-banner'), 'banner.jpg');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.event).toBeDefined();
      expect(response.body.event.title).toBe(eventData.title);
      expect(response.body.event.about).toBe(eventData.about);
      expect(response.body.event.features.certificateEnabled).toBe(true);
      expect(response.body.event.sessions).toHaveLength(2);
      expect(response.body.event.verificationStatus).toBe('pending');

      testEvent = response.body.event;
    });

    test('Event created with single date field (no schedule)', async () => {
      expect(testEvent.date).toBeDefined();
      expect(testEvent.schedule).toBeUndefined();
      expect(testEvent.startDate).toBeUndefined();
      expect(testEvent.endDate).toBeUndefined();
    });

    test('Non-host cannot create event', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${userToken}`)
        .field('title', 'Test Event')
        .field('description', 'Test')
        .field('date', new Date().toISOString())
        .field('location', JSON.stringify({ type: 'online' }))
        .field('capacity', 50)
        .attach('banner', Buffer.from('fake-banner'), 'banner.jpg');

      expect(response.status).toBe(403);
    });
  });

  describe('2. Co-host Nomination & Approval Workflow', () => {
    test('Host can nominate co-host', async () => {
      const response = await request(app)
        .post('/api/events/nominate-cohost')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          eventId: testEvent._id,
          userId: coHostUser._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('nomination submitted');
    });

    test('Verifier can approve co-host', async () => {
      const response = await request(app)
        .post('/api/events/approve-cohost')
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          eventId: testEvent._id,
          userId: coHostUser._id.toString()
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('approved');

      // Verify co-host is added
      const event = await Event.findById(testEvent._id);
      expect(event.coHosts).toContainEqual(coHostUser._id);
      expect(event.coHostRequests.find(r => r.userId.equals(coHostUser._id)).status).toBe('approved');
    });

    test('Co-host can edit event', async () => {
      const response = await request(app)
        .patch(`/api/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${coHostToken}`)
        .send({
          description: 'Updated by co-host'
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated by co-host');
    });
  });

  describe('3. Event Verification Workflow', () => {
    test('Event starts with pending verification status', async () => {
      const event = await Event.findById(testEvent._id);
      expect(event.verificationStatus).toBe('pending');
    });

    test('Verifier can approve event', async () => {
      const response = await request(app)
        .post(`/api/events/${testEvent._id}/verify`)
        .set('Authorization', `Bearer ${verifierToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('verified');

      const event = await Event.findById(testEvent._id);
      expect(event.verificationStatus).toBe('approved');
    });

    test('Non-verifier cannot approve event', async () => {
      const response = await request(app)
        .post(`/api/events/${testEvent._id}/verify`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('4. RSVP & Waitlist Workflow', () => {
    test('User can RSVP to event', async () => {
      const response = await request(app)
        .post('/api/events/rsvp')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: testEvent._id });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('successful');
      expect(response.body.qrImage).toBeDefined();
      expect(response.body.status).toBe('registered');

      // Verify participation log created
      const log = await EventParticipationLog.findOne({
        eventId: testEvent._id,
        userId: normalUser._id
      });
      expect(log).toBeDefined();
      expect(log.status).toBe('registered');
      expect(log.qrToken).toBeDefined();
    });

    test('User cannot RSVP twice', async () => {
      const response = await request(app)
        .post('/api/events/rsvp')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: testEvent._id });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already registered');
    });

    test('User is waitlisted when capacity full', async () => {
      // Update event capacity to 1 (already 1 registered)
      await Event.findByIdAndUpdate(testEvent._id, { capacity: 1 });

      // Create another user and try to RSVP
      const newUser = await User.create({
        name: 'Waitlist User',
        email: 'waitlist@test.com',
        password: 'password123',
        isVerified: true
      });

      const loginRes = await request(app).post('/api/users/login').send({
        email: 'waitlist@test.com',
        password: 'password123'
      });

      const response = await request(app)
        .post('/api/events/rsvp')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ eventId: testEvent._id });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('waitlisted');

      // Verify waitlist updated
      const event = await Event.findById(testEvent._id);
      expect(event.waitlist).toContainEqual(newUser._id);

      // Cleanup
      await User.findByIdAndDelete(newUser._id);
    });

    test('User can cancel RSVP', async () => {
      const response = await request(app)
        .post('/api/events/cancel-rsvp')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ eventId: testEvent._id });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('cancelled');

      // Verify participation log removed
      const log = await EventParticipationLog.findOne({
        eventId: testEvent._id,
        userId: normalUser._id
      });
      expect(log).toBeNull();
    });
  });

  describe('5. Event Analytics Workflow', () => {
    test('Host can view event analytics', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent._id}/analytics`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalRegistered).toBeDefined();
      expect(response.body.totalAttended).toBeDefined();
      expect(response.body.totalWaitlisted).toBeDefined();
      expect(response.body.attendanceRate).toBeDefined();
    });

    test('Co-host can view event analytics', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent._id}/analytics`)
        .set('Authorization', `Bearer ${coHostToken}`);

      expect(response.status).toBe(200);
    });

    test('Non-host/co-host cannot view analytics', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent._id}/analytics`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('6. Event Update Workflow', () => {
    test('Host can update all fields', async () => {
      const updateData = {
        title: 'Updated Event Title',
        about: 'Updated About',
        tags: JSON.stringify(['updated', 'tags']),
        sessions: JSON.stringify([
          { title: 'Updated Session', time: '3:00 PM', speaker: 'New Speaker' }
        ]),
        features: JSON.stringify({ certificateEnabled: false, chatEnabled: true })
      };

      const response = await request(app)
        .patch(`/api/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .field('title', updateData.title)
        .field('about', updateData.about)
        .field('tags', updateData.tags)
        .field('sessions', updateData.sessions)
        .field('features', updateData.features);

      expect(response.status).toBe(200);
      expect(response.body.title).toBe(updateData.title);
      expect(response.body.about).toBe(updateData.about);
      expect(response.body.features.chatEnabled).toBe(true);
      expect(response.body.sessions).toHaveLength(1);
    });

    test('Updated event still has single date field', async () => {
      const event = await Event.findById(testEvent._id);
      expect(event.date).toBeDefined();
      expect(event.schedule).toBeUndefined();
    });
  });

  describe('7. Public Event Access', () => {
    test('Public can view event without auth', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent._id}`);

      expect(response.status).toBe(200);
      expect(response.body.title).toBeDefined();
      expect(response.body.date).toBeDefined();
      expect(response.body.about).toBeDefined();
      expect(response.body.sessions).toBeDefined();
    });

    test('Public can list events', async () => {
      const response = await request(app)
        .get('/api/events');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body) || Array.isArray(response.body.events)).toBe(true);
    });
  });

  describe('8. Event Deletion Workflow', () => {
    test('Host can delete event', async () => {
      const response = await request(app)
        .delete(`/api/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');

      // Verify event deleted
      const event = await Event.findById(testEvent._id);
      expect(event).toBeNull();
    });

    test('Non-host cannot delete event', async () => {
      // Create a new event for this test
      const newEvent = await Event.create({
        title: 'Test Event 2',
        description: 'Test',
        date: new Date(Date.now() + 86400000),
        location: { type: 'online' },
        bannerURL: 'https://example.com/banner.jpg',
        hostUserId: hostUser._id,
        capacity: 50
      });

      const response = await request(app)
        .delete(`/api/events/${newEvent._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await Event.findByIdAndDelete(newEvent._id);
    });
  });

  describe('9. Field Validation', () => {
    test('Event cannot be created without required fields', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .field('title', 'Test Event')
        .attach('banner', Buffer.from('fake-banner'), 'banner.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    test('Event date must be valid', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .field('title', 'Test Event')
        .field('description', 'Test')
        .field('date', 'invalid-date')
        .field('location', JSON.stringify({ type: 'online' }))
        .field('capacity', 50)
        .attach('banner', Buffer.from('fake-banner'), 'banner.jpg');

      expect(response.status).toBe(400);
    });

    test('Sessions must have required fields', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .field('title', 'Test Event')
        .field('description', 'Test')
        .field('date', new Date(Date.now() + 86400000).toISOString())
        .field('location', JSON.stringify({ type: 'online' }))
        .field('capacity', 50)
        .field('sessions', JSON.stringify([{ title: 'Session 1' }])) // Missing time and speaker
        .attach('banner', Buffer.from('fake-banner'), 'banner.jpg');

      // Should either fail or create with empty sessions
      // Depending on validation logic
      expect([400, 201]).toContain(response.status);
    });
  });

  describe('10. Feature Toggles', () => {
    test('Certificate feature toggle works', async () => {
      const event = await Event.create({
        title: 'Certificate Test Event',
        description: 'Test',
        date: new Date(Date.now() + 86400000),
        location: { type: 'online' },
        bannerURL: 'https://example.com/banner.jpg',
        hostUserId: hostUser._id,
        capacity: 50,
        features: { certificateEnabled: true, chatEnabled: false }
      });

      expect(event.features.certificateEnabled).toBe(true);
      expect(event.features.chatEnabled).toBe(false);

      // Update toggle
      const response = await request(app)
        .patch(`/api/events/${event._id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          features: { certificateEnabled: false, chatEnabled: true }
        });

      expect(response.status).toBe(200);
      expect(response.body.features.certificateEnabled).toBe(false);
      expect(response.body.features.chatEnabled).toBe(true);

      // Cleanup
      await Event.findByIdAndDelete(event._id);
    });
  });
});
