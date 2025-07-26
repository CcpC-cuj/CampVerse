const Event = require('../Models/Event');
const User = require('../Models/User');

// Host dashboard: list events and basic analytics
async function getHostDashboard(req, res) {
  try {
    const userId = req.user.id;
    const events = await Event.find({ hostUserId: userId });
    const totalEvents = events.length;
    const upcomingEvents = events.filter(e => e.schedule && e.schedule.start > new Date());
    const totalParticipants = events.reduce((sum, e) => sum + (e.participants ? e.participants.length : 0), 0);
    return res.json({
      totalEvents,
      totalParticipants,
      upcomingEvents: upcomingEvents.length,
      events
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching host dashboard.' });
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
    await User.findByIdAndUpdate(userId, { $push: { 'eventHistory.hosted': event._id } });
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
    if (!event) return res.status(404).json({ error: 'Event not found or not owned by user.' });
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
    const event = await Event.findOneAndDelete({ _id: eventId, hostUserId: userId });
    if (!event) return res.status(404).json({ error: 'Event not found or not owned by user.' });
    // Optionally remove from user's eventHistory.hosted
    await User.findByIdAndUpdate(userId, { $pull: { 'eventHistory.hosted': eventId } });
    return res.json({ message: 'Event deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error deleting event.' });
  }
}

// List all events hosted by the current user
async function getMyEvents(req, res) {
  try {
    const userId = req.user.id;
    const events = await Event.find({ hostUserId: userId });
    return res.json(events);
  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching events.' });
  }
}

// Get participants for a given event (host only)
async function getEventParticipants(req, res) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const event = await Event.findOne({ _id: eventId, hostUserId: userId }).populate('participants');
    if (!event) return res.status(404).json({ error: 'Event not found or not owned by user.' });
    return res.json({ participants: event.participants });
  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching participants.' });
  }
}

module.exports = {
  getHostDashboard,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventParticipants
}; 