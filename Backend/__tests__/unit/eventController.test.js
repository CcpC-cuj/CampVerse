const mongoose = require('mongoose');
const Event = require('../../Models/Event');
const User = require('../../Models/User');
const EventParticipationLog = require('../../Models/EventParticipationLog');

// Mock external dependencies
jest.mock('../../Models/Event');
jest.mock('../../Models/User');
jest.mock('../../Models/EventParticipationLog');

// Import the controller functions
const eventController = require('../../Controller/event');

describe('Event Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock request, response, and next
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('createEvent', () => {
    it('should create a new event successfully', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description',
        category: 'Technology',
        location: 'Test Location',
        schedule: {
          start: new Date('2024-01-01T10:00:00Z'),
          end: new Date('2024-01-01T12:00:00Z')
        },
        maxParticipants: 50,
        registrationDeadline: new Date('2023-12-31T23:59:59Z')
      };
      
      mockReq.body = eventData;
      mockReq.user = { userId: 'host123' };
      
      const mockEvent = {
        _id: 'event123',
        ...eventData,
        hostId: 'host123',
        status: 'upcoming',
        participants: [],
        save: jest.fn().mockResolvedValue(true)
      };
      
      Event.create = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.createEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(Event.create).toHaveBeenCalledWith({
        ...eventData,
        hostId: 'host123',
        status: 'upcoming',
        participants: []
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Event created successfully',
        event: mockEvent
      });
    });

    it('should handle event creation errors', async () => {
      const eventData = {
        title: 'Test Event',
        description: 'Test Description'
      };
      
      mockReq.body = eventData;
      mockReq.user = { userId: 'host123' };
      
      Event.create = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await eventController.createEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server error creating event.'
      });
    });
  });

  describe('getAllEvents', () => {
    it('should return all events with pagination', async () => {
      const mockEvents = [
        {
          _id: 'event1',
          title: 'Event 1',
          status: 'upcoming'
        },
        {
          _id: 'event2',
          title: 'Event 2',
          status: 'upcoming'
        }
      ];
      
      mockReq.query = {
        page: '1',
        limit: '10',
        category: 'Technology',
        status: 'upcoming'
      };
      
      Event.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockEvents)
          })
        })
      });
      
      Event.countDocuments = jest.fn().mockResolvedValue(2);
      
      // Execute
      await eventController.getAllEvents(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(Event.find).toHaveBeenCalledWith({
        category: 'Technology',
        status: 'upcoming'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        events: mockEvents,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalEvents: 2,
          hasNext: false,
          hasPrev: false
        }
      });
    });

    it('should handle database errors', async () => {
      mockReq.query = {};
      
      Event.find = jest.fn().mockRejectedValue(new Error('Database error'));
      
      // Execute
      await eventController.getAllEvents(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Server error fetching events.'
      });
    });
  });

  describe('getEventById', () => {
    it('should return event by ID successfully', async () => {
      const mockEvent = {
        _id: 'event123',
        title: 'Test Event',
        description: 'Test Description',
        hostId: 'host123',
        status: 'upcoming'
      };
      
      mockReq.params = { id: 'event123' };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.getEventById(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(Event.findById).toHaveBeenCalledWith('event123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockEvent);
    });

    it('should return 404 if event not found', async () => {
      mockReq.params = { id: 'nonexistent' };
      
      Event.findById = jest.fn().mockResolvedValue(null);
      
      // Execute
      await eventController.getEventById(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Event not found'
      });
    });
  });

  describe('updateEvent', () => {
    it('should update event successfully', async () => {
      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated Description'
      };
      
      mockReq.body = updateData;
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'host123' };
      
      const mockEvent = {
        _id: 'event123',
        title: 'Original Title',
        description: 'Original Description',
        hostId: 'host123',
        save: jest.fn().mockResolvedValue(true)
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.updateEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(Event.findById).toHaveBeenCalledWith('event123');
      expect(mockEvent.title).toBe('Updated Event Title');
      expect(mockEvent.description).toBe('Updated Description');
      expect(mockEvent.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Event updated successfully',
        event: mockEvent
      });
    });

    it('should return 403 if user is not the host', async () => {
      mockReq.body = { title: 'Updated Title' };
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'otheruser' };
      
      const mockEvent = {
        _id: 'event123',
        hostId: 'host123'
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.updateEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Only the event host can update this event'
      });
    });
  });

  describe('deleteEvent', () => {
    it('should delete event successfully', async () => {
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'host123' };
      
      const mockEvent = {
        _id: 'event123',
        hostId: 'host123',
        remove: jest.fn().mockResolvedValue(true)
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.deleteEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(Event.findById).toHaveBeenCalledWith('event123');
      expect(mockEvent.remove).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Event deleted successfully'
      });
    });
  });

  describe('joinEvent', () => {
    it('should join event successfully', async () => {
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'user123' };
      
      const mockEvent = {
        _id: 'event123',
        title: 'Test Event',
        participants: [],
        maxParticipants: 50,
        save: jest.fn().mockResolvedValue(true)
      };
      
      const mockUser = {
        _id: 'user123',
        name: 'Test User'
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      User.findById = jest.fn().mockResolvedValue(mockUser);
      EventParticipationLog.create = jest.fn().mockResolvedValue({});
      
      // Execute
      await eventController.joinEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(Event.findById).toHaveBeenCalledWith('event123');
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(mockEvent.participants).toContain('user123');
      expect(mockEvent.save).toHaveBeenCalled();
      expect(EventParticipationLog.create).toHaveBeenCalledWith({
        eventId: 'event123',
        userId: 'user123',
        action: 'joined'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully joined the event',
        event: mockEvent
      });
    });

    it('should return error if event is full', async () => {
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'user123' };
      
      const mockEvent = {
        _id: 'event123',
        participants: Array(50).fill('user'),
        maxParticipants: 50
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.joinEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Event is full'
      });
    });

    it('should return error if user already joined', async () => {
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'user123' };
      
      const mockEvent = {
        _id: 'event123',
        participants: ['user123'],
        maxParticipants: 50
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.joinEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'You have already joined this event'
      });
    });
  });

  describe('leaveEvent', () => {
    it('should leave event successfully', async () => {
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'user123' };
      
      const mockEvent = {
        _id: 'event123',
        participants: ['user123', 'user456'],
        save: jest.fn().mockResolvedValue(true)
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      EventParticipationLog.create = jest.fn().mockResolvedValue({});
      
      // Execute
      await eventController.leaveEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(Event.findById).toHaveBeenCalledWith('event123');
      expect(mockEvent.participants).not.toContain('user123');
      expect(mockEvent.save).toHaveBeenCalled();
      expect(EventParticipationLog.create).toHaveBeenCalledWith({
        eventId: 'event123',
        userId: 'user123',
        action: 'left'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Successfully left the event',
        event: mockEvent
      });
    });

    it('should return error if user not in event', async () => {
      mockReq.params = { id: 'event123' };
      mockReq.user = { userId: 'user123' };
      
      const mockEvent = {
        _id: 'event123',
        participants: ['user456']
      };
      
      Event.findById = jest.fn().mockResolvedValue(mockEvent);
      
      // Execute
      await eventController.leaveEvent(mockReq, mockRes, mockNext);
      
      // Assertions
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'You are not part of this event'
      });
    });
  });
}); 