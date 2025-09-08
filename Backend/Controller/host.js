const Event = require('../Models/Event');
const User = require('../Models/User');
const EventParticipationLog = require('../Models/EventParticipationLog');

// Host dashboard: list events and detailed analytics
async function getHostDashboard(req, res) {
  try {
    const userId = req.user.id;
    const events = await Event.find({ hostUserId: userId });
    const totalEvents = events.length;
    const upcomingEvents = events.filter((e) => e.date && e.date > new Date());

    // Get detailed analytics for each event
    const eventsWithAnalytics = await Promise.all(
      events.map(async (event) => {
        const logs = await EventParticipationLog.find({ eventId: event._id });
        const totalRegistered = logs.length;
        const totalAttended = logs.filter(
          (l) => l.status === 'attended',
        ).length;
        const totalWaitlisted = logs.filter(
          (l) => l.status === 'waitlisted',
        ).length;
        const totalPaid = logs.filter((l) => l.paymentType === 'paid').length;
        const totalFree = logs.filter((l) => l.paymentType === 'free').length;

        return {
          ...event.toObject(),
          analytics: {
            totalRegistered,
            totalAttended,
            totalWaitlisted,
            totalPaid,
            totalFree,
            attendanceRate:
              totalRegistered > 0
                ? ((totalAttended / totalRegistered) * 100).toFixed(2)
                : 0,
          },
        };
      }),
    );

    const totalParticipants = eventsWithAnalytics.reduce(
      (sum, e) => sum + e.analytics.totalRegistered,
      0,
    );
    const totalAttended = eventsWithAnalytics.reduce(
      (sum, e) => sum + e.analytics.totalAttended,
      0,
    );

    return res.json({
      totalEvents,
      totalParticipants,
      totalAttended,
      upcomingEvents: upcomingEvents.length,
      events: eventsWithAnalytics,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'Server error fetching host dashboard.' });
  }
}

// Create a new event (host only)
async function createEvent(req, res) {
  try {
    const userId = req.user.id;
    const eventData = req.body;
    eventData.hostUserId = userId;
    const event = await Event.create(eventData);
    // Optionally add event to user's eventHistory.hosted
    await User.findByIdAndUpdate(userId, {
      $push: { 'eventHistory.hosted': event._id },
    });
    return res.status(201).json(event);
  } catch (err) {
    return res.status(500).json({ error: 'Server error creating event.' });
  }
}

// Update an event (host only)
async function updateEvent(req, res) {
  try {
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
  } catch (err) {
    return res.status(500).json({ error: 'Server error updating event.' });
  }
}

// Delete an event (host only)
async function deleteEvent(req, res) {
  try {
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
  } catch (err) {
    return res.status(500).json({ error: 'Server error deleting event.' });
  }
}

// List all events hosted by the current user
async function getMyEvents(req, res) {
  try {
    const userId = req.user.id;
    const events = await Event.find({ hostUserId: userId }).lean();
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
  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching events.' });
  }
}

// Get participants for a given event (host only)
async function getEventParticipants(req, res) {
  try {
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
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'Server error fetching participants.' });
  }
}

module.exports = {
  getHostDashboard,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventParticipants,
};
