const Event = require('../Models/Event');
const User = require('../Models/User');
const Certificate = require('../Models/Certificate');
const EventParticipationLog = require('../Models/EventParticipationLog');
const SearchAnalytics = require('../Models/SearchAnalytics');

// Advanced event search (filter, sort, paginate)
const advancedEventSearch = async (req, res) => {
  try {
    const { q, tags, type, startDate, endDate, sort = 'date', order = 'desc', page = 1, limit = 10 } = req.query;
    const filter = {};
    if (q) filter.title = { $regex: q, $options: 'i' };
    if (tags) filter.tags = { $in: Array.isArray(tags) ? tags : tags.split(',') };
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter['schedule.start'] = {};
      if (startDate) filter['schedule.start'].$gte = new Date(startDate);
      if (endDate) filter['schedule.start'].$lte = new Date(endDate);
    }
    const sortField = sort === 'date' ? 'schedule.start' : sort;
    const sortOrder = order === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      events
    });
  } catch (err) {
    res.status(500).json({ error: 'Error searching events.' });
  }
};

// User analytics (participation stats)
const getUserAnalytics = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const hosted = await Event.countDocuments({ hostUserId: userId });
    const cohosted = await Event.countDocuments({ coHosts: userId });
    const attended = await EventParticipationLog.countDocuments({ userId, status: 'attended' });
    const registered = await EventParticipationLog.countDocuments({ userId, status: 'registered' });
    const waitlisted = await EventParticipationLog.countDocuments({ userId, status: 'waitlisted' });
    const certificates = await Certificate.countDocuments({ userId });
    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      hosted,
      cohosted,
      attended,
      registered,
      waitlisted,
      certificates
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user analytics.' });
  }
};

// Platform insights (global stats)
const getPlatformInsights = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalCertificates = await Certificate.countDocuments();
    const totalParticipations = await EventParticipationLog.countDocuments();
    const totalAttended = await EventParticipationLog.countDocuments({ status: 'attended' });
    const totalRegistered = await EventParticipationLog.countDocuments({ status: 'registered' });
    const totalWaitlisted = await EventParticipationLog.countDocuments({ status: 'waitlisted' });
    res.json({
      totalUsers,
      totalEvents,
      totalCertificates,
      totalParticipations,
      totalAttended,
      totalRegistered,
      totalWaitlisted
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching platform insights.' });
  }
};

// Search analytics (admin only)
const getSearchAnalytics = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await SearchAnalytics.countDocuments();
    const analytics = await SearchAnalytics.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email');
    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      analytics
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching search analytics.' });
  }
};

// Advanced event analytics (demographics, engagement, certificates, top participants)
const getAdvancedEventAnalytics = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const demographics = await EventParticipationLog.aggregate([
      { $match: { eventId } },
      { $group: { _id: '$userId', count: { $sum: 1 } } }
    ]);

    const engagement = await EventParticipationLog.countDocuments({ eventId });
    const certificatesIssued = await Certificate.countDocuments({ eventId });

    const topParticipants = await EventParticipationLog.aggregate([
      { $match: { eventId } },
      { $group: { _id: '$userId', participationCount: { $sum: 1 } } },
      { $sort: { participationCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      event: { id: event._id, title: event.title },
      demographics,
      engagement,
      certificatesIssued,
      topParticipants
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching advanced event analytics.' });
  }
};

// User activity timeline (participation over time)
const getUserActivityTimeline = async (req, res) => {
  try {
    const userId = req.params.userId;
    const logs = await EventParticipationLog.find({ userId }).sort({ timestamp: 1 });
    if (!logs.length) return res.status(404).json({ error: 'No activity found for the user.' });
    
    const timeline = logs.map(log => ({
      eventId: log.eventId,
      status: log.status,
      timestamp: log.timestamp
    }));
    
    res.json({ userId, timeline });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching user activity timeline.' });
  }
};

// Platform growth trends (new users/events/certificates per month)
const getGrowthTrends = async (req, res) => {
  try {
    const userGrowth = await User.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const eventGrowth = await Event.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const certificateGrowth = await Certificate.aggregate([
      { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json({
      userGrowth,
      eventGrowth,
      certificateGrowth
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching growth trends.' });
  }
};

// Zero-result searches (admin only)
const getZeroResultSearches = async (req, res) => {
  res.json({ message: 'Zero-result searches endpoint (placeholder)' });
};

module.exports = {
  advancedEventSearch,
  getUserAnalytics,
  getPlatformInsights,
  getSearchAnalytics,
  getAdvancedEventAnalytics,
  getUserActivityTimeline,
  getGrowthTrends,
  getZeroResultSearches
}; 