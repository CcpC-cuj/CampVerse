const Event = require('../Models/Event');
const User = require('../Models/User');
const EventParticipationLog = require('../Models/EventParticipationLog');
const { uploadEventImage } = require('../Services/driveService');
const qrcode = require('qrcode');
const nodemailer = require('nodemailer');

// Create a new event (host/co-host)
async function createEvent(req, res) {
  try {
    const { title, description, tags, type, organizer, schedule, isPaid, price, capacity } = req.body;
    let logoURL, bannerURL;
    if (req.files && req.files['logo']) {
      logoURL = await uploadEventImage(req.files['logo'][0].buffer, req.files['logo'][0].originalname, 'logo');
    }
    if (req.files && req.files['banner']) {
      bannerURL = await uploadEventImage(req.files['banner'][0].buffer, req.files['banner'][0].originalname, 'banner');
    }
    const event = await Event.create({
      title, description, tags, type, organizer, schedule, isPaid, price, capacity,
      logoURL, bannerURL,
      hostUserId: req.user.id,
      institutionId: req.user.institutionId
    });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Error creating event.' });
  }
}

// Get event by ID
async function getEventById(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching event.' });
  }
}

// Update event (host/co-host)
async function updateEvent(req, res) {
  try {
    const update = req.body;
    if (req.files && req.files['logo']) {
      update.logoURL = await uploadEventImage(req.files['logo'][0].buffer, req.files['logo'][0].originalname, 'logo');
    }
    if (req.files && req.files['banner']) {
      update.bannerURL = await uploadEventImage(req.files['banner'][0].buffer, req.files['banner'][0].originalname, 'banner');
    }
    const event = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: 'Error updating event.' });
  }
}

// Delete event (host/co-host)
async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting event.' });
  }
}

// RSVP/register for event (user)
async function rsvpEvent(req, res) {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    // Waitlist logic
    const registeredCount = await EventParticipationLog.countDocuments({ eventId, status: 'registered' });
    const isFull = event.capacity && registeredCount >= event.capacity;
    const status = isFull ? 'waitlisted' : 'registered';
    // Generate QR token
    const qrToken = `${eventId}_${userId}_${Date.now()}`;
    // Generate QR code image
    const qrImage = await qrcode.toDataURL(qrToken);
    // Create participation log
    const log = await EventParticipationLog.create({
      userId, eventId, status, qrToken
    });
    // Email QR code to user
    await sendQrEmail(req.user.email, qrImage, event.title);
    res.status(201).json({ message: `RSVP successful. Status: ${status}. QR code sent to email.`, qrImage });
  } catch (err) {
    res.status(500).json({ error: 'Error registering for event.' });
  }
}

// Email QR code to user
async function sendQrEmail(to, qrImage, eventTitle) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
  await transporter.sendMail({
    from: 'CampVerse <noreply@campverse.com>',
    to,
    subject: `Your Ticket for ${eventTitle}`,
    html: `<p>Here is your QR ticket for <b>${eventTitle}</b>:</p><img src="${qrImage}" alt="QR Ticket" />`,
  });
}

// Get participants (host/co-host only)
async function getParticipants(req, res) {
  try {
    const eventId = req.params.id;
    const logs = await EventParticipationLog.find({ eventId });
    const users = await User.find({ _id: { $in: logs.map(l => l.userId) } });
    // Map logs to user details
    const participants = logs.map(log => {
      const user = users.find(u => u._id.equals(log.userId));
      return {
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        paymentType: log.paymentType,
        paymentStatus: log.paymentStatus,
        status: log.status,
        attendanceTimestamp: log.attendanceTimestamp
      };
    });
    res.json(participants);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching participants.' });
  }
}

// Host/co-host scans QR to mark attendance
async function scanQr(req, res) {
  try {
    const { eventId, qrToken } = req.body;
    const log = await EventParticipationLog.findOne({ eventId, qrToken });
    if (!log) return res.status(404).json({ error: 'Invalid QR code.' });
    log.status = 'attended';
    log.attendanceTimestamp = new Date();
    await log.save();
    res.json({ message: 'Attendance marked.' });
  } catch (err) {
    res.status(500).json({ error: 'Error marking attendance.' });
  }
}

// Event analytics (host/co-host only)
async function getEventAnalytics(req, res) {
  try {
    const eventId = req.params.id;
    const logs = await EventParticipationLog.find({ eventId });
    const totalRegistered = logs.length;
    const totalAttended = logs.filter(l => l.status === 'attended').length;
    const totalWaitlisted = logs.filter(l => l.status === 'waitlisted').length;
    const totalPaid = logs.filter(l => l.paymentType === 'paid').length;
    const totalFree = logs.filter(l => l.paymentType === 'free').length;
    const paymentSuccess = logs.filter(l => l.paymentStatus === 'success').length;
    const paymentPending = logs.filter(l => l.paymentStatus === 'pending').length;
    
    res.json({ 
      totalRegistered, 
      totalAttended, 
      totalWaitlisted,
      totalPaid,
      totalFree,
      paymentSuccess,
      paymentPending,
      attendanceRate: totalRegistered > 0 ? (totalAttended / totalRegistered * 100).toFixed(2) : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics.' });
  }
}

// Nominate co-host (main host)
async function nominateCoHost(req, res) {
  try {
    const { eventId, userId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    event.coHostRequests.push({ userId, status: 'pending', requestedBy: req.user.id, requestedAt: new Date() });
    await event.save();
    res.json({ message: 'Co-host nomination submitted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error nominating co-host.' });
  }
}

// Approve co-host (verifier)
async function approveCoHost(req, res) {
  try {
    const { eventId, userId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const reqIndex = event.coHostRequests.findIndex(r => r.userId.equals(userId) && r.status === 'pending');
    if (reqIndex === -1) return res.status(404).json({ error: 'Co-host request not found.' });
    event.coHostRequests[reqIndex].status = 'approved';
    event.coHostRequests[reqIndex].approvedBy = req.user.id;
    event.coHostRequests[reqIndex].approvedAt = new Date();
    event.coHosts.push(userId);
    await event.save();
    res.json({ message: 'Co-host approved.' });
  } catch (err) {
    res.status(500).json({ error: 'Error approving co-host.' });
  }
}

// Reject co-host (verifier)
async function rejectCoHost(req, res) {
  try {
    const { eventId, userId } = req.body;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const reqIndex = event.coHostRequests.findIndex(r => r.userId.equals(userId) && r.status === 'pending');
    if (reqIndex === -1) return res.status(404).json({ error: 'Co-host request not found.' });
    event.coHostRequests[reqIndex].status = 'rejected';
    event.coHostRequests[reqIndex].approvedBy = req.user.id;
    event.coHostRequests[reqIndex].approvedAt = new Date();
    await event.save();
    res.json({ message: 'Co-host rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting co-host.' });
  }
}

// Event verification (verifier)
async function verifyEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    event.verificationStatus = 'approved';
    await event.save();
    res.json({ message: 'Event verified.' });
  } catch (err) {
    res.status(500).json({ error: 'Error verifying event.' });
  }
}

// Google Calendar link endpoint
async function getGoogleCalendarLink(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const start = new Date(event.schedule.start).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(event.schedule.end).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const link = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.organizer)}`;
    res.json({ calendarLink: link });
  } catch (err) {
    res.status(500).json({ error: 'Error generating calendar link.' });
  }
}

module.exports = {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  getParticipants,
  scanQr,
  getEventAnalytics,
  nominateCoHost,
  approveCoHost,
  rejectCoHost,
  verifyEvent,
  getGoogleCalendarLink
}; 