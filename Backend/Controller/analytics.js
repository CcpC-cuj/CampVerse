const Event = require('../Models/Event');
const User = require('../Models/User');
const Certificate = require('../Models/Certificate');
const EventParticipationLog = require('../Models/EventParticipationLog');
const SearchAnalytics = require('../Models/SearchAnalytics');

// Advanced event search (filter, sort, paginate)
const advancedEventSearch = async (req, res) => {
  try {
    const {
      q,
      tags,
      type,
      startDate,
      endDate,
      sort = 'date',
      order = 'desc',
      page = 1,
      limit = 10,
    } = req.query;

    // Input validation
    const validSortFields = ['date', 'title', 'type']; // Add other valid fields as needed
    const validOrderValues = ['asc', 'desc'];
    const filter = {};

    if (q && typeof q === 'string') filter.title = { $regex: q, $options: 'i' };
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      filter.tags = {
        $in: tagsArray.map((tag) => tag.trim()).filter((tag) => tag),
      };
    }
    if (type && typeof type === 'string') filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate && !isNaN(Date.parse(startDate))) filter.date.$gte = new Date(startDate);
      if (endDate && !isNaN(Date.parse(endDate))) filter.date.$lte = new Date(endDate);
    }

    const sortField = validSortFields.includes(sort)
      ? sort === 'date'
        ? 'date'
        : sort
      : 'date';
    const sortOrder = validOrderValues.includes(order)
      ? order === 'asc'
        ? 1
        : -1
      : -1;
    const validatedPage =
      Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
    const validatedLimit =
      Number.isInteger(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;
    const skip = (validatedPage - 1) * validatedLimit;
    const total = await Event.countDocuments(filter);
    const events = await Event.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(validatedLimit);
    res.json({
      total,
      page: validatedPage,
      limit: validatedLimit,
      events,
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
    const attended = await EventParticipationLog.countDocuments({
      userId,
      status: 'attended',
    });
    const registered = await EventParticipationLog.countDocuments({
      userId,
      status: 'registered',
    });
    const waitlisted = await EventParticipationLog.countDocuments({
      userId,
      status: 'waitlisted',
    });
    const certificates = await Certificate.countDocuments({ userId });
    res.json({
      user: { id: user._id, name: user.name, email: user.email },
      hosted,
      cohosted,
      attended,
      registered,
      waitlisted,
      certificates,
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
    const totalAttended = await EventParticipationLog.countDocuments({
      status: 'attended',
    });
    const totalRegistered = await EventParticipationLog.countDocuments({
      status: 'registered',
    });
    const totalWaitlisted = await EventParticipationLog.countDocuments({
      status: 'waitlisted',
    });
    res.json({
      totalUsers,
      totalEvents,
      totalCertificates,
      totalParticipations,
      totalAttended,
      totalRegistered,
      totalWaitlisted,
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
      analytics,
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
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const engagement = await EventParticipationLog.countDocuments({ eventId });
    const certificatesIssued = await Certificate.countDocuments({ eventId });

    const topParticipants = await EventParticipationLog.aggregate([
      { $match: { eventId } },
      { $group: { _id: '$userId', participationCount: { $sum: 1 } } },
      { $sort: { participationCount: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      event: { id: event._id, title: event.title },
      demographics,
      engagement,
      certificatesIssued,
      topParticipants,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching advanced event analytics.' });
  }
};

// User activity timeline (participation over time)
const getUserActivityTimeline = async (req, res) => {
  try {
    const userId = req.params.userId;
    const logs = await EventParticipationLog.find({ userId }).sort({
      timestamp: 1,
    });
    if (!logs.length)
      return res.status(404).json({ error: 'No activity found for the user.' });

    const timeline = logs.map((log) => ({
      eventId: log.eventId,
      status: log.status,
      timestamp: log.timestamp,
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
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const eventGrowth = await Event.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const certificateGrowth = await Certificate.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({
      userGrowth,
      eventGrowth,
      certificateGrowth,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching growth trends.' });
  }
};

// Zero-result searches (admin only)
const getZeroResultSearches = async (req, res) => {
  try {
    // Check if the user is an admin (placeholder logic, replace with actual authentication/authorization)
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query for zero-result searches
    const filter = { resultsCount: 0 }; // Assuming `resultsCount` field tracks the number of results
    const total = await SearchAnalytics.countDocuments(filter);
    const zeroResultSearches = await SearchAnalytics.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('userId', 'name email'); // Populate user details if needed

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      zeroResultSearches,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching zero-result searches.' });
  }
};

module.exports = {
  advancedEventSearch,
  getUserAnalytics,
  getPlatformInsights,
  getSearchAnalytics,
  getAdvancedEventAnalytics,
  getUserActivityTimeline,
  getGrowthTrends,
  getZeroResultSearches,
};
