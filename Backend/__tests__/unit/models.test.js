const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Import models
const User = require('../../Models/User');
const Event = require('../../Models/Event');
const Certificate = require('../../Models/Certificate');
const Achievement = require('../../Models/Achievement');
const Institution = require('../../Models/Institution');

describe('Model Unit Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  describe('User Model', () => {
    it('should create a valid user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@university.edu',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
        roles: ['student'],
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.phone).toBe(userData.phone);
      expect(savedUser.roles).toEqual(userData.roles);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should require name field', async () => {
      const userData = {
        email: 'test@university.edu',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      };

      const user = new User(userData);
      let error;

      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it('should require email field', async () => {
      const userData = {
        name: 'Test User',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      };

      const user = new User(userData);
      let error;

      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      };

      const user = new User(userData);
      let error;

      try {
        await user.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.email).toBeDefined();
    });

    it('should set default roles to student', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@university.edu',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.roles).toEqual(['student']);
    });

    it('should set default isVerified to false', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@university.edu',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.isVerified).toBe(false);
    });
  });

  describe('Event Model', () => {
    it('should create a valid event', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        organizer: 'Test Organizer',
        hostUserId: new mongoose.Types.ObjectId(),
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
        },
        type: 'workshop',
      };

      const event = new Event(eventData);
      const savedEvent = await event.save();

      expect(savedEvent._id).toBeDefined();
      expect(savedEvent.title).toBe(eventData.title);
      expect(savedEvent.description).toBe(eventData.description);
      expect(savedEvent.organizer).toBe(eventData.organizer);
      expect(savedEvent.hostUserId).toEqual(eventData.hostUserId);
      expect(savedEvent.type).toBe(eventData.type);
      expect(savedEvent.verificationStatus).toBe('pending');
      expect(savedEvent.participants).toEqual([]);
    });

    it('should require title field', async () => {
      const eventData = {
        description: 'Test Description',
        organizer: 'Test Organizer',
        hostUserId: new mongoose.Types.ObjectId(),
      };

      const event = new Event(eventData);
      let error;

      try {
        await event.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.title).toBeDefined();
    });

    it('should require organizer field', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        hostUserId: new mongoose.Types.ObjectId(),
      };

      const event = new Event(eventData);
      let error;

      try {
        await event.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.organizer).toBeDefined();
    });

    it('should set default verificationStatus to pending', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        organizer: 'Test Organizer',
        hostUserId: new mongoose.Types.ObjectId(),
      };

      const event = new Event(eventData);
      const savedEvent = await event.save();

      expect(savedEvent.verificationStatus).toBe('pending');
    });

    it('should initialize participants as empty array', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        organizer: 'Test Organizer',
        hostUserId: new mongoose.Types.ObjectId(),
      };

      const event = new Event(eventData);
      const savedEvent = await event.save();

      expect(savedEvent.participants).toEqual([]);
    });
  });

  describe('Certificate Model', () => {
    it('should create a valid certificate', async () => {
      const certificateData = {
        userId: new mongoose.Types.ObjectId(),
        eventId: new mongoose.Types.ObjectId(),
        type: 'participant',
        certificateURL: 'https://example.com/certificate.pdf',
      };

      const certificate = new Certificate(certificateData);
      const savedCertificate = await certificate.save();

      expect(savedCertificate._id).toBeDefined();
      expect(savedCertificate.userId).toEqual(certificateData.userId);
      expect(savedCertificate.eventId).toEqual(certificateData.eventId);
      expect(savedCertificate.type).toBe(certificateData.type);
      expect(savedCertificate.status).toBe('pending');
      expect(savedCertificate.certificateURL).toBe(
        certificateData.certificateURL,
      );
      expect(savedCertificate.issuedAt).toBeDefined();
    });

    it('should require userId field', async () => {
      const certificateData = {
        eventId: new mongoose.Types.ObjectId(),
        type: 'participant',
      };

      const certificate = new Certificate(certificateData);
      let error;

      try {
        await certificate.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.userId).toBeDefined();
    });

    it('should require eventId field', async () => {
      const certificateData = {
        userId: new mongoose.Types.ObjectId(),
        type: 'participant',
      };

      const certificate = new Certificate(certificateData);
      let error;

      try {
        await certificate.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.eventId).toBeDefined();
    });

    it('should require type field', async () => {
      const certificateData = {
        userId: new mongoose.Types.ObjectId(),
        eventId: new mongoose.Types.ObjectId(),
      };

      const certificate = new Certificate(certificateData);
      let error;

      try {
        await certificate.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.type).toBeDefined();
    });

    it('should validate certificate type enum', async () => {
      const validTypes = ['participant', 'winner', 'organizer', 'co-organizer'];

      for (const type of validTypes) {
        const certificateData = {
          userId: new mongoose.Types.ObjectId(),
          eventId: new mongoose.Types.ObjectId(),
          type,
        };

        const certificate = new Certificate(certificateData);
        const savedCertificate = await certificate.save();

        expect(savedCertificate.type).toBe(type);
      }
    });
  });

  describe('Achievement Model', () => {
    it('should create a valid achievement', async () => {
      const achievementData = {
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Achievement',
        badgeIcon: '🏆',
        points: 100,
        rank: 1,
      };

      const achievement = new Achievement(achievementData);
      const savedAchievement = await achievement.save();

      expect(savedAchievement._id).toBeDefined();
      expect(savedAchievement.userId).toEqual(achievementData.userId);
      expect(savedAchievement.title).toBe(achievementData.title);
      expect(savedAchievement.badgeIcon).toBe(achievementData.badgeIcon);
      expect(savedAchievement.points).toBe(achievementData.points);
      expect(savedAchievement.rank).toBe(achievementData.rank);
      expect(savedAchievement.earnedAt).toBeDefined();
    });

    it('should require userId field', async () => {
      const achievementData = {
        title: 'Test Achievement',
        badgeIcon: '🏆',
      };

      const achievement = new Achievement(achievementData);
      let error;

      try {
        await achievement.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.userId).toBeDefined();
    });

    it('should set earnedAt automatically', async () => {
      const achievementData = {
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Achievement',
        badgeIcon: '🏆',
      };

      const achievement = new Achievement(achievementData);
      const savedAchievement = await achievement.save();

      expect(savedAchievement.earnedAt).toBeDefined();
      expect(savedAchievement.earnedAt).toBeInstanceOf(Date);
    });

    it('should set default points to 0', async () => {
      const achievementData = {
        userId: new mongoose.Types.ObjectId(),
        title: 'Test Achievement',
        badgeIcon: '🏆',
      };

      const achievement = new Achievement(achievementData);
      const savedAchievement = await achievement.save();

      expect(savedAchievement.points).toBe(0);
    });
  });

  describe('Institution Model', () => {
    it('should create a valid institution', async () => {
      const institutionData = {
        name: 'Test University',
        type: 'university',
        emailDomain: 'test.edu',
        location: {
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
        },
        isVerified: true,
      };

      const institution = new Institution(institutionData);
      const savedInstitution = await institution.save();

      expect(savedInstitution._id).toBeDefined();
      expect(savedInstitution.name).toBe(institutionData.name);
      expect(savedInstitution.type).toBe(institutionData.type);
      expect(savedInstitution.emailDomain).toBe(institutionData.emailDomain);
      expect(savedInstitution.location).toEqual(institutionData.location);
      expect(savedInstitution.isVerified).toBe(institutionData.isVerified);
    });

    it('should require name field', async () => {
      const institutionData = {
        type: 'university',
        emailDomain: 'test.edu',
      };

      const institution = new Institution(institutionData);
      let error;

      try {
        await institution.save();
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it('should set default isVerified to false', async () => {
      const institutionData = {
        name: 'Test University',
        type: 'university',
        emailDomain: 'test.edu',
      };

      const institution = new Institution(institutionData);
      const savedInstitution = await institution.save();

      expect(savedInstitution.isVerified).toBe(false);
    });
  });

  describe('Model Relationships', () => {
    it('should link user to events', async () => {
      // Create a user
      const user = await User.create({
        name: 'Test User',
        email: 'test@university.edu',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      });

      // Create an event with the user as host
      const event = await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        organizer: 'Test Organizer',
        hostUserId: user._id,
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
        },
      });

      expect(event.hostUserId).toEqual(user._id);
    });

    it('should link user to certificates', async () => {
      // Create a user
      const user = await User.create({
        name: 'Test User',
        email: 'test@university.edu',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      });

      // Create an event
      const event = await Event.create({
        title: 'Test Event',
        description: 'Test Description',
        organizer: 'Test Organizer',
        hostUserId: user._id,
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z'),
        },
      });

      // Create a certificate
      const certificate = await Certificate.create({
        userId: user._id,
        eventId: event._id,
        type: 'participant',
        certificateURL: 'https://example.com/certificate.pdf',
      });

      expect(certificate.userId).toEqual(user._id);
      expect(certificate.eventId).toEqual(event._id);
    });

    it('should link user to achievements', async () => {
      // Create a user
      const user = await User.create({
        name: 'Test User',
        email: 'test@university.edu',
        phone: '1234567890',
        passwordHash: 'hashedPassword123',
      });

      // Create an achievement
      const achievement = await Achievement.create({
        userId: user._id,
        title: 'Test Achievement',
        badgeIcon: '🏆',
        points: 100,
        rank: 1,
      });

      expect(achievement.userId).toEqual(user._id);
    });
  });
});
