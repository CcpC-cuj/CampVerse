const Institution = require('../Models/Institution');
const User = require('../Models/User');
const Event = require('../Models/Event');
const EventParticipationLog = require('../Models/EventParticipationLog');
const Certificate = require('../Models/Certificate');
const { notifyInstitutionRequest } = require('../Services/notification');

// Create a new institution (admin only)
async function createInstitution(req, res) {
  try {
    const { name, type, location, emailDomain } = req.body;
    const institution = await Institution.create({ name, type, location, emailDomain, isVerified: false });
    res.status(201).json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error creating institution.' });
  }
}

// Get all institutions (admin only)
async function getInstitutions(req, res) {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching institutions.' });
  }
}

// Get institution by ID (admin or self)
async function getInstitutionById(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching institution.' });
  }
}

// Update institution (admin only)
async function updateInstitution(req, res) {
  try {
    const institution = await Institution.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error updating institution.' });
  }
}

// Delete institution (admin only)
async function deleteInstitution(req, res) {
  try {
    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    res.json({ message: 'Institution deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting institution.' });
  }
}

// Request institution verification (student)
async function requestInstitutionVerification(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    const { institutionName, email, website, phone, type, info } = req.body || {};
    institution.verificationRequested = true;
    institution.verificationRequests = institution.verificationRequests || [];
    institution.verificationRequests.push({
      requestedBy: req.user.id,
      institutionName: institutionName || institution.name,
      officialEmail: email || '',
      website: website || '',
      phone: phone || '',
      type: type || institution.type,
      info: info || ''
    });
    await institution.save();

    // Optionally update user's status to pending (already default on registration)
    await User.findByIdAndUpdate(req.user.id, { institutionVerificationStatus: 'pending' });

    // Notify platform admins in-app
    try {
      const user = await User.findById(req.user.id).select('name email');
      await notifyInstitutionRequest({
        requesterId: req.user.id,
        requesterName: user?.name || 'Unknown',
        requesterEmail: user?.email || '',
        institutionName: institutionName || institution.name,
        type: type || institution.type
      });
    } catch (e) {
      // non-blocking
    }

    res.json({ message: 'Verification request submitted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error requesting verification.' });
  }
}

// Approve institution verification (admin only)
async function approveInstitutionVerification(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    institution.isVerified = true;
    institution.verificationRequested = false;
    await institution.save();
    res.json({ message: 'Institution verified.' });
  } catch (err) {
    res.status(500).json({ error: 'Error approving verification.' });
  }
}

// Reject institution verification (admin only)
async function rejectInstitutionVerification(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    institution.verificationRequested = false;
    await institution.save();
    res.json({ message: 'Institution verification rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting verification.' });
  }
}

// Get institution analytics (institution or admin)
async function getInstitutionAnalytics(req, res) {
  try {
    const institutionId = req.params.id;
    const studentCount = await User.countDocuments({ institutionId });
    const eventCount = await Event.countDocuments({ institutionId });
    // Optionally, add more analytics (certificates, achievements, etc.)
    res.json({ studentCount, eventCount });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics.' });
  }
}

// Get institution dashboard (institution or admin)
async function getInstitutionDashboard(req, res) {
  try {
    const institutionId = req.params.id;
    // Total students
    const studentCount = await User.countDocuments({ institutionId });
    // Total events
    const eventCount = await Event.countDocuments({ institutionId });
    // Total event participations
    const participationLogs = await EventParticipationLog.find({ eventId: { $in: (await Event.find({ institutionId }, '_id')).map(e => e._id) } });
    const participationCount = participationLogs.length;
    // Participation rate
    const participationRate = studentCount > 0 ? participationCount / studentCount : 0;
    // Certificates issued
    const certificateCount = await Certificate.countDocuments({ eventId: { $in: (await Event.find({ institutionId }, '_id')).map(e => e._id) } });
    // Active students (participated in at least one event)
    const activeStudentIds = [...new Set(participationLogs.map(log => log.userId.toString()))];
    const activeStudents = activeStudentIds.length;
    // Inactive students
    const inactiveStudents = studentCount - activeStudents;
    // Recent/upcoming events
    const now = new Date();
    const recentEvents = await Event.find({ institutionId }).sort({ 'schedule.start': -1 }).limit(5);
    // Event participation breakdown
    const eventBreakdown = await Promise.all(
      recentEvents.map(async (event) => {
        const logs = participationLogs.filter(log => log.eventId.toString() === event._id.toString());
        return {
          id: event._id,
          title: event.title,
          registered: logs.length,
          attended: logs.filter(l => l.status === 'attended').length,
          waitlisted: logs.filter(l => l.status === 'waitlisted').length
        };
      })
    );
    // Top events (by participation)
    const topEvents = eventBreakdown.sort((a, b) => b.registered - a.registered).slice(0, 3);
    // Top students (by participations/certificates)
    const studentParticipationMap = {};
    participationLogs.forEach(log => {
      const id = log.userId.toString();
      studentParticipationMap[id] = (studentParticipationMap[id] || 0) + 1;
    });
    const topStudents = Object.entries(studentParticipationMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, participations]) => ({
        id,
        participations
      }));
    // Event types breakdown
    const events = await Event.find({ institutionId });
    const eventTypes = {};
    events.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });
    // Pending verifications (students/events)
    const pendingStudentVerifications = await User.countDocuments({ institutionId, isVerified: false });
    const pendingEventVerifications = await Event.countDocuments({ institutionId, verificationStatus: { $ne: 'approved' } });
    // Feedback/ratings (if available)
    // Placeholder: If you have a Feedback model, aggregate here
    const feedback = {
      averageRating: null,
      recentComments: []
    };
    res.json({
      studentCount,
      eventCount,
      participationCount,
      participationRate,
      certificateCount,
      activeStudents,
      inactiveStudents,
      recentEvents,
      eventBreakdown,
      topEvents,
      topStudents,
      eventTypes,
      pendingVerifications: {
        students: pendingStudentVerifications,
        events: pendingEventVerifications
      },
      feedback
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching dashboard.' });
  }
}

async function searchInstitutions(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await Institution.find({
      $or: [{ name: regex }, { emailDomain: regex }]
    }).limit(20);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Error searching institutions.' });
  }
}

async function requestNewInstitution(req, res) {
  try {
    const { name, type, location, emailDomain: _ignoredEmailDomain, website, phone, info } = req.body || {};
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required.' });
    }

    // Derive domain from requester email for correctness
    const requester = await User.findById(req.user.id).select('email name');
    if (!requester || !requester.email || !requester.email.includes('@')) {
      return res.status(400).json({ error: 'Requester email not found to derive domain.' });
    }
    const computedDomain = requester.email.split('@')[1].toLowerCase();

    // Create a temporary institution entry
    const institution = await Institution.create({
      name,
      type: type || 'temporary',
      location: location || { city: '', state: '', country: '' },
      emailDomain: computedDomain,
      isVerified: false,
      isTemporary: true,
      verificationRequested: true,
      verificationRequests: [
        {
          requestedBy: req.user.id,
          institutionName: name,
          officialEmail: requester.email,
          website: website || '',
          phone: phone || '',
          type,
          info: info || ''
        }
      ]
    });

    // Update user to reference this institution and pending status
    await User.findByIdAndUpdate(req.user.id, {
      institutionId: institution._id,
      institutionVerificationStatus: 'pending'
    });

    // Notify platform admins
    try {
      await notifyInstitutionRequest({
        requesterId: req.user.id,
        requesterName: requester?.name || 'Unknown',
        requesterEmail: requester?.email || '',
        institutionName: name,
        type
      });
    } catch (e) {}

    return res.status(201).json({ message: 'Institution request submitted.', institution });
  } catch (err) {
    res.status(500).json({ error: 'Error submitting institution request.' });
  }
}

module.exports = {
  createInstitution,
  getInstitutions,
  getInstitutionById,
  updateInstitution,
  deleteInstitution,
  requestInstitutionVerification,
  approveInstitutionVerification,
  rejectInstitutionVerification,
  getInstitutionAnalytics,
  getInstitutionDashboard,
  searchInstitutions,
  requestNewInstitution
}; 