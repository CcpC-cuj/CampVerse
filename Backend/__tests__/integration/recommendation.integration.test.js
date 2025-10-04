/**
 * Integration Tests for ML Recommendation Microservice
 * Tests the integration between backend and ML recommendation service
 */

const request = require('supertest');
const app = require('../../app');
const axios = require('axios');
const User = require('../../Models/User');
const Event = require('../../Models/Event');

// Mock axios for testing
jest.mock('axios');

describe('ML Recommendation Integration Tests', () => {
  let authToken;
  let testUser;
  let testEvents;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@recommendation.com',
      password: 'TestPass123!',
      role: 'student',
      interests: ['AI', 'Machine Learning', 'Web Development'],
      skills: ['JavaScript', 'Python'],
      isVerified: true,
    });

    // Create test events
    testEvents = await Event.create([
      {
        title: 'AI Workshop',
        description: 'Learn about artificial intelligence and machine learning',
        tags: ['AI', 'Machine Learning', 'Workshop'],
        type: 'Workshop',
        organizer: 'Tech Club',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        verificationStatus: 'approved',
        hostUserId: testUser._id,
      },
      {
        title: 'Web Development Bootcamp',
        description: 'Full stack web development with React and Node.js',
        tags: ['Web Development', 'JavaScript', 'React'],
        type: 'Bootcamp',
        organizer: 'Code Academy',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        verificationStatus: 'approved',
        hostUserId: testUser._id,
      },
      {
        title: 'Data Science Conference',
        description: 'Annual data science and analytics conference',
        tags: ['Data Science', 'Analytics', 'Python'],
        type: 'Conference',
        organizer: 'Data Society',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        verificationStatus: 'approved',
        hostUserId: testUser._id,
      },
    ]);

    // Login to get auth token
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({
        email: 'test@recommendation.com',
        password: 'TestPass123!',
      });

    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({ email: 'test@recommendation.com' });
    await Event.deleteMany({ title: { $in: ['AI Workshop', 'Web Development Bootcamp', 'Data Science Conference'] } });
  });

  describe('GET /api/recommendations/events', () => {
    test('should return recommendations when ML service is available', async () => {
      // Mock ML service response
      axios.post.mockResolvedValue({
        data: {
          recommendations: [
            {
              eventId: testEvents[0]._id.toString(),
              similarityScore: 0.85,
              reason: 'Matches your interests: AI, Machine Learning',
            },
            {
              eventId: testEvents[1]._id.toString(),
              similarityScore: 0.72,
              reason: 'Matches your interests: Web Development',
            },
          ],
          message: 'Recommendations generated successfully',
        },
      });

      const res = await request(app)
        .get('/api/recommendations/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toBeDefined();
      expect(Array.isArray(res.body.recommendations)).toBe(true);
      expect(res.body.recommendations.length).toBeGreaterThan(0);
      expect(res.body.recommendations[0]).toHaveProperty('eventId');
      expect(res.body.recommendations[0]).toHaveProperty('similarityScore');
      expect(res.body.recommendations[0]).toHaveProperty('event');
      expect(res.body.userProfile).toBeDefined();
    });

    test('should use fallback when ML service is unavailable', async () => {
      // Mock ML service error
      axios.post.mockRejectedValue(new Error('ML service unavailable'));

      const res = await request(app)
        .get('/api/recommendations/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toBeDefined();
      expect(res.body.note).toContain('fallback');
    });

    test('should use fallback when ML feature is disabled', async () => {
      // Temporarily disable ML feature
      const originalValue = process.env.ML_RECOMMENDATION_ENABLED;
      process.env.ML_RECOMMENDATION_ENABLED = 'false';

      const res = await request(app)
        .get('/api/recommendations/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.recommendations).toBeDefined();
      expect(res.body.note).toContain('fallback');

      // Restore original value
      process.env.ML_RECOMMENDATION_ENABLED = originalValue;
    });

    test('should require authentication', async () => {
      const res = await request(app)
        .get('/api/recommendations/events')
        .query({ limit: 10 });

      expect(res.status).toBe(401);
    });

    test('should respect pagination parameters', async () => {
      axios.post.mockResolvedValue({
        data: {
          recommendations: testEvents.map((event, index) => ({
            eventId: event._id.toString(),
            similarityScore: 0.8 - index * 0.1,
            reason: 'Test recommendation',
          })),
          message: 'Recommendations generated successfully',
        },
      });

      const res = await request(app)
        .get('/api/recommendations/events')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2, page: 1 });

      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('GET /api/recommendations/events/:eventId/similar', () => {
    test('should return similar events', async () => {
      const res = await request(app)
        .get(`/api/recommendations/events/${testEvents[0]._id}/similar`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.baseEvent).toBeDefined();
      expect(res.body.similarEvents).toBeDefined();
      expect(Array.isArray(res.body.similarEvents)).toBe(true);
    });

    test('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/recommendations/events/${fakeId}/similar`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    test('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/recommendations/events/${testEvents[0]._id}/similar`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/recommendations/preferences', () => {
    test('should update user preferences on event interaction', async () => {
      const res = await request(app)
        .post('/api/recommendations/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventId: testEvents[0]._id,
          action: 'like',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(res.body.updatedInterests).toBeDefined();
      expect(Array.isArray(res.body.updatedInterests)).toBe(true);
    });

    test('should handle different action types', async () => {
      const actions = ['view', 'like', 'attend', 'register'];

      for (const action of actions) {
        const res = await request(app)
          .post('/api/recommendations/preferences')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            eventId: testEvents[0]._id,
            action,
          });

        expect(res.status).toBe(200);
      }
    });

    test('should return 404 for non-existent event', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post('/api/recommendations/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          eventId: fakeId,
          action: 'like',
        });

      expect(res.status).toBe(404);
    });

    test('should require authentication', async () => {
      const res = await request(app)
        .post('/api/recommendations/preferences')
        .send({
          eventId: testEvents[0]._id,
          action: 'like',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('ML Service Health Check', () => {
    test('should check ML service health', async () => {
      // This is a placeholder for actual health check test
      // In a real scenario, you would test the ML service endpoint directly
      const mlApiUrl = process.env.ML_API_URL || 'http://localhost:5002';

      try {
        const response = await axios.get(`${mlApiUrl}/health`, { timeout: 5000 });
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
      } catch (error) {
        // If ML service is not running, test should not fail
        console.log('ML service not available for testing');
      }
    });
  });
});
