const mongoose = require('mongoose');
const Event = require('../Models/Event');
const User = require('../Models/User');
const EventParticipationLog = require('../Models/EventParticipationLog');
const { asyncHandler } = require('../Middleware/errorHandler');

// Host dashboard: list events and detailed analytics
const getHostDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Optimized: Use a single aggregation pipeline to fetch events and their analytics
  const eventsWithAnalytics = await Event.aggregate([
    { $match: { hostUserId: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'eventparticipationlogs',
        localField: '_id',
        foreignField: 'eventId',
        as: 'logs'
      }
    },
    {
      $project: {
        title: 1,
        date: 1,
        location: 1,
        status: 1,
        capacity: 1,
        type: 1,
        isPaid: 1,
        price: 1,
        bannerURL: 1,
        logoURL: 1,
        verificationStatus: 1,
        createdAt: 1,
        updatedAt: 1,
        analytics: {
          totalRegistered: { $size: '$logs' },
          totalAttended: {
            $size: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: { $eq: ['$$log.status', 'attended'] }
              }
            }
          },
          totalWaitlisted: {
            $size: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: { $eq: ['$$log.status', 'waitlisted'] }
              }
            }
          },
          totalPaid: {
            $size: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: { $eq: ['$$log.paymentType', 'paid'] }
              }
            }
          },
          totalFree: {
            $size: {
              $filter: {
                input: '$logs',
                as: 'log',
                cond: { $eq: ['$$log.paymentType', 'free'] }
              }
            }
          }
        }
      }
    },
    {
      $addFields: {
        'analytics.attendanceRate': {
          $cond: [
            { $gt: ['$analytics.totalRegistered', 0] },
            {
              $multiply: [
                { $divide: ['$analytics.totalAttended', '$analytics.totalRegistered'] },
                100
              ]
            },
            0
          ]
        }
      }
    }
  ]);

  const totalEvents = eventsWithAnalytics.length;
  const totalParticipants = eventsWithAnalytics.reduce(
    (sum, e) => sum + e.analytics.totalRegistered,
    0,
  );
  const totalAttendedCount = eventsWithAnalytics.reduce(
    (sum, e) => sum + e.analytics.totalAttended,
    0,
  );
  const upcomingEventsCount = eventsWithAnalytics.filter(
    (e) => e.date && new Date(e.date) > new Date()
  ).length;

  // Formatting attendanceRate to string as per original implementation
  eventsWithAnalytics.forEach(event => {
    event.analytics.attendanceRate = event.analytics.attendanceRate.toFixed(2);
  });

  return res.json({
    totalEvents,
    totalParticipants,
    totalAttended: totalAttendedCount,
    upcomingEvents: upcomingEventsCount,
    events: eventsWithAnalytics,
  });
});

// Create a new event (host only)
const createEvent = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const eventData = req.body;
  eventData.hostUserId = userId;
  const event = await Event.create(eventData);
  // Optionally add event to user's eventHistory.hosted
  await User.findByIdAndUpdate(userId, {
    $push: { 'eventHistory.hosted': event._id },
  });
  return res.status(201).json(event);
});

// Update an event (host only)
const updateEvent = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.id;
  const event = await Event.findOne({ _id: eventId, hostUserId: userId });
  if (!event)
    return res
      .status(404)
      .json({ error: 'Event not found or not owned by user.' });
  Object.assign(event, req.body);
  await event.save();
  return res.json(event);
});

// Delete an event (host only)
const deleteEvent = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.id;
  const event = await Event.findOneAndDelete({
    _id: eventId,
    hostUserId: userId,
  });
  if (!event)
    return res
      .status(404)
      .json({ error: 'Event not found or not owned by user.' });
  // Optionally remove from user's eventHistory.hosted
  await User.findByIdAndUpdate(userId, {
    $pull: { 'eventHistory.hosted': eventId },
  });
  return res.json({ message: 'Event deleted.' });
});

// List all events hosted by the current user
const getMyEvents = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const events = await Event.find({
    $or: [
      { hostUserId: userId },
      { coHosts: userId }
    ]
  }).lean();
  const eventIds = events.map(e => e._id);
  const logs = await EventParticipationLog.find({ eventId: { $in: eventIds } }).lean();
  const users = await User.find({ _id: { $in: logs.map(l => l.userId) } }).lean();

  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u; });

  const eventParticipantsMap = {};
  logs.forEach(log => {
    if (!eventParticipantsMap[log.eventId]) eventParticipantsMap[log.eventId] = [];
    eventParticipantsMap[log.eventId].push({
      userId: log.userId,
      name: userMap[log.userId.toString()]?.name,
      email: userMap[log.userId.toString()]?.email,
      phone: userMap[log.userId.toString()]?.phone,
      status: log.status,
      paymentType: log.paymentType,
      paymentStatus: log.paymentStatus,
      attendanceTimestamp: log.attendanceTimestamp,
      timestamp: log.timestamp,
    });
  });

  const eventsWithParticipants = events.map(event => ({
    ...event,
    participants: eventParticipantsMap[event._id] || []
  }));
  return res.json(eventsWithParticipants);
});

// Get participants for a given event (host only)
const getEventParticipants = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const eventId = req.params.id;
  const event = await Event.findOne({ _id: eventId, hostUserId: userId });
  if (!event)
    return res
      .status(404)
      .json({ error: 'Event not found or not owned by user.' });

  // Get detailed participant information from EventParticipationLog
  const logs = await EventParticipationLog.find({ eventId }).populate(
    'userId',
    'name email phone',
  );
  const participants = logs.map((log) => ({
    userId: log.userId._id,
    name: log.userId.name,
    email: log.userId.email,
    phone: log.userId.phone,
    status: log.status,
    paymentType: log.paymentType,
    paymentStatus: log.paymentStatus,
    attendanceTimestamp: log.attendanceTimestamp,
    timestamp: log.timestamp,
  }));

  return res.json({ participants });
});

module.exports = {
  getHostDashboard,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventParticipants,
};
