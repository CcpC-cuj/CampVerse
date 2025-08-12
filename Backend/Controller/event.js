/*
 * ML Integration & Drive Structure (Planned/Current):
 *
 * 1. Event Recommendation:
 *    - Endpoint will call external ML API to fetch personalized event recommendations for users (for dashboard).
 *    - Fallback logic should be present if ML API is unavailable.
 *
 * 2. Certificate Generation:
 *    - Host selects/uploads certificate template for event.
 *    - Certificate generation endpoint will call ML API, restricted to users marked as 'attended'.
 *    - Generated certificates will be stored and linked to users.
 *    - (Planned) All certificates for an event will be stored in a Drive folder named after the event.
 *
 * 3. Event Images:
 *    - Logos and banners are uploaded to separate Drive folders (see driveService.js for details).
 *
 * These comments are for documentation and planning only; they do not affect code execution.
 */
const Event = require('../Models/Event');
const User = require('../Models/User');
const EventParticipationLog = require('../Models/EventParticipationLog');
const {
  uploadEventImage,
  deleteEventImage,
} = require('../Services/driveService');
const qrcode = require('qrcode');
const { createEmailService } = require('../Services/email');
const emailService = createEmailService();
const { notifyUser, notifyUsers } = require('../Services/notification');

// Create a new event (host/co-host)
async function createEvent(req, res) {
  try {
    const {
      title,
      description,
      tags,
      type,
      organizer,
      schedule,
      isPaid,
      price,
      capacity,
    } = req.body;
    let logoURL, bannerURL;
    if (req.files && req.files['logo']) {
      const f = req.files['logo'][0];
      logoURL = await uploadEventImage(
        f.buffer,
        f.originalname,
        'logo',
        f.mimetype,
      );
    }
    if (req.files && req.files['banner']) {
      const f = req.files['banner'][0];
      bannerURL = await uploadEventImage(
        f.buffer,
        f.originalname,
        'banner',
        f.mimetype,
      );
    }
    const event = await Event.create({
      title,
      description,
      tags,
      type,
      organizer,
      schedule,
      isPaid,
      price,
      capacity,
      logoURL,
      bannerURL,
      hostUserId: req.user.id,
      institutionId: req.user.institutionId,
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
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (req.files && req.files['logo']) {
      if (event.logoURL) await deleteEventImage(event.logoURL);
      const f = req.files['logo'][0];
      update.logoURL = await uploadEventImage(
        f.buffer,
        f.originalname,
        'logo',
        f.mimetype,
      );
    }
    if (req.files && req.files['banner']) {
      if (event.bannerURL) await deleteEventImage(event.bannerURL);
      const f = req.files['banner'][0];
      update.bannerURL = await uploadEventImage(
        f.buffer,
        f.originalname,
        'banner',
        f.mimetype,
      );
    }
    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: 'Error updating event.' });
  }
}

// Delete event (host/co-host)
async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.logoURL) await deleteEventImage(event.logoURL);
    if (event.bannerURL) await deleteEventImage(event.bannerURL);
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
    const registeredCount = await EventParticipationLog.countDocuments({
      eventId,
      status: 'registered',
    });
    const isFull = event.capacity && registeredCount >= event.capacity;
    const status = isFull ? 'waitlisted' : 'registered';
    // Generate QR token
    const qrToken = `${eventId}_${userId}_${Date.now()}`;
    // Generate QR code image
    const qrImage = await qrcode.toDataURL(qrToken);
    // Create participation log
    const log = await EventParticipationLog.create({
      userId,
      eventId,
      status,
      qrToken,
    });
    // Update event waitlist if waitlisted
    if (status === 'waitlisted') {
      if (
        !event.waitlist.map((id) => id.toString()).includes(userId.toString())
      ) {
        event.waitlist.push(userId);
        await event.save();
      }
    } else {
      // If user was previously waitlisted, remove from waitlist
      event.waitlist = event.waitlist.filter(
        (id) => id.toString() !== userId.toString(),
      );
      await event.save();
    }
    // Email QR code to user
    await sendQrEmail(req.user.email, qrImage, event.title);
    console.log(
      `[AUDIT] RSVP: user ${userId} for event ${eventId} as ${status}`,
    );
    res
      .status(201)
      .json({
        message: `RSVP successful. Status: ${status}. QR code sent to email.`,
        qrImage,
      });
    // Notify user (confirmation)
    await notifyUser({
      userId,
      type: 'rsvp',
      message: `You have successfully registered for ${event.title}.`,
      data: { eventId, eventTitle: event.title },
      emailOptions: {
        to: req.user.email,
        subject: `RSVP Confirmation for ${event.title}`,
        html: `<p>Hi ${req.user.name},<br>You have successfully registered for <b>${event.title}</b>.</p>`,
      },
    });
    // Notify host/co-hosts (new registration)
    const hostAndCoHosts = [event.hostUserId, ...(event.coHosts || [])]
      .filter((id) => id != null) // Remove null/undefined values
      .map((id) => String(id)) // Safely convert to string
      .filter((id) => id !== userId); // Exclude the current user
    await notifyUsers({
      userIds: hostAndCoHosts,
      type: 'rsvp',
      message: `${req.user.name} has registered for your event: ${event.title}.`,
      data: { eventId, userId },
      emailOptionsFn: async (hostId) => null, // Only in-app for hosts/co-hosts for now
    });
  } catch (err) {
    res.status(500).json({ error: 'Error registering for event.' });
  }
}

// Cancel RSVP for event (user)
async function cancelRsvp(req, res) {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    // Remove participation log
    const log = await EventParticipationLog.findOneAndDelete({
      eventId,
      userId,
    });
    if (!log)
      return res.status(404).json({ error: 'No RSVP found for this user.' });
    // Remove from event waitlist if present
    event.waitlist = event.waitlist.filter(
      (id) => id.toString() !== userId.toString(),
    );
    await event.save();
    // If user was registered, promote first waitlisted user
    if (log.status === 'registered') {
      if (event.waitlist.length > 0) {
        const nextUserId = event.waitlist[0];
        // Update their participation log
        const nextLog = await EventParticipationLog.findOne({
          eventId,
          userId: nextUserId,
          status: 'waitlisted',
        });
        if (nextLog) {
          nextLog.status = 'registered';
          await nextLog.save();
          // Notify promoted user
          const promotedUser = await User.findById(nextUserId);
          if (promotedUser) {
            await notifyUser({
              userId: nextUserId,
              type: 'rsvp',
              message: `You have been promoted from waitlist to registered for ${event.title}.`,
              data: { eventId, eventTitle: event.title },
              emailOptions: {
                to: promotedUser.email,
                subject: `You're Registered for ${event.title}!`,
                html: `<p>Hi ${promotedUser.name},<br>You have been promoted from the waitlist and are now registered for <b>${event.title}</b>!</p>`,
              },
            });
          }
        }
        // Remove from waitlist
        event.waitlist = event.waitlist.slice(1);
        await event.save();
      }
    }
    console.log(`[AUDIT] Cancel RSVP: user ${userId} for event ${eventId}`);
    res.json({ message: 'RSVP cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Error cancelling RSVP.' });
  }
}

// Email QR code to user
async function sendQrEmail(to, qrImage, eventTitle) {
  await emailService.sendMail({
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
    const users = await User.find({ _id: { $in: logs.map((l) => l.userId) } });
    // Map logs to user details
    const participants = logs.map((log) => {
      const user = users.find((u) => u._id.equals(log.userId));
      return {
        name: user?.name,
        email: user?.email,
        phone: user?.phone,
        paymentType: log.paymentType,
        paymentStatus: log.paymentStatus,
        status: log.status,
        attendanceTimestamp: log.attendanceTimestamp,
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
    if (!eventId || !qrToken) {
      return res
        .status(400)
        .json({ error: 'eventId and qrToken are required.' });
    }
    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const userId = req.user.id;
    const isHost = event.hostUserId && event.hostUserId.toString() === userId;
    const isCoHost =
      event.coHosts &&
      event.coHosts.map((id) => id.toString()).includes(userId);
    if (!isHost && !isCoHost) {
      return res
        .status(403)
        .json({
          error:
            'Only host or approved co-host can scan attendance for this event.',
        });
    }
    // Brute-force protection (simple in-memory, per user per event)
    if (!global.scanRateLimit) global.scanRateLimit = {};
    const key = `${userId}_${eventId}`;
    const now = Date.now();
    if (global.scanRateLimit[key] && now - global.scanRateLimit[key] < 2000) {
      return res
        .status(429)
        .json({ error: 'Too many scans. Please wait a moment.' });
    }
    global.scanRateLimit[key] = now;
    // Find participation log
    const log = await EventParticipationLog.findOne({ eventId, qrToken });
    if (!log) return res.status(404).json({ error: 'Invalid QR code.' });
    if (log.status === 'attended') {
      return res
        .status(409)
        .json({ error: 'Attendance already marked for this user.' });
    }
    // Mark attendance
    log.status = 'attended';
    log.attendanceTimestamp = new Date();
    log.attendanceMarkedBy = userId;
    log.attendanceMarkedAt = new Date();
    await log.save();
    // Fetch participant user for notification
    const participant = await User.findById(log.userId);
    if (participant) {
      await notifyUser({
        userId: log.userId,
        type: 'attendance',
        message: `Your attendance for ${event.title} has been marked. Thank you for participating!`,
        data: { eventId, eventTitle: event.title },
        emailOptions: {
          to: participant.email,
          subject: `Attendance Marked for ${event.title}`,
          html: `<p>Hi ${participant.name},<br>Your attendance for <b>${event.title}</b> has been successfully marked. Thank you for participating!</p>`,
        },
      });
    }
    // Audit log
    console.log(
      `[AUDIT] Scan QR: user ${userId} scanned for event ${eventId}, participant ${log.userId}, log ${log._id}`,
    );
    res.json({ message: 'Attendance marked.' });
  } catch (err) {
    console.error('Error in scanQr:', err);
    res.status(500).json({ error: 'Error marking attendance.' });
  }
}

// Event analytics (host/co-host only)
async function getEventAnalytics(req, res) {
  try {
    const eventId = req.params.id;
    const logs = await EventParticipationLog.find({ eventId });
    const totalRegistered = logs.length;
    const totalAttended = logs.filter((l) => l.status === 'attended').length;
    const totalWaitlisted = logs.filter(
      (l) => l.status === 'waitlisted',
    ).length;
    const totalPaid = logs.filter((l) => l.paymentType === 'paid').length;
    const totalFree = logs.filter((l) => l.paymentType === 'free').length;
    const paymentSuccess = logs.filter(
      (l) => l.paymentStatus === 'success',
    ).length;
    const paymentPending = logs.filter(
      (l) => l.paymentStatus === 'pending',
    ).length;

    res.json({
      totalRegistered,
      totalAttended,
      totalWaitlisted,
      totalPaid,
      totalFree,
      paymentSuccess,
      paymentPending,
      attendanceRate:
        totalRegistered > 0
          ? ((totalAttended / totalRegistered) * 100).toFixed(2)
          : 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics.' });
  }
}

// Nominate co-host (main host)
async function nominateCoHost(req, res) {
  try {
    const { eventId, userId } = req.body;
    if (!eventId || !userId) {
      return res
        .status(400)
        .json({ error: 'eventId and userId are required.' });
    }
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    // Only host can nominate
    if (event.hostUserId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: 'Only the main host can nominate co-hosts.' });
    }
    // Prevent duplicate nominations
    if (
      event.coHostRequests.some(
        (r) => r.userId.toString() === userId && r.status === 'pending',
      )
    ) {
      return res
        .status(400)
        .json({ error: 'Co-host nomination already pending.' });
    }
    event.coHostRequests.push({
      userId,
      status: 'pending',
      requestedBy: req.user.id,
      requestedAt: new Date(),
    });
    await event.save();
    // Notify nominated user
    const nominatedUser = await User.findById(userId);
    if (nominatedUser) {
      await notifyUser({
        userId,
        type: 'cohost',
        message: `You have been nominated as a co-host for ${event.title}. Please wait for verifier approval.`,
        data: { eventId, eventTitle: event.title },
        emailOptions: {
          to: nominatedUser.email,
          subject: `Co-host Nomination for ${event.title}`,
          html: `<p>Hi ${nominatedUser.name},<br>You have been nominated as a co-host for <b>${event.title}</b>. Please wait for approval from a verifier.</p>`,
        },
      });
    }
    // Notify verifiers (approval needed)
    const verifiers = await User.find({ roles: 'verifier' });
    await notifyUsers({
      userIds: verifiers.map((v) => v._id),
      type: 'cohost',
      message: `A new co-host nomination for event: ${event.title} requires your approval.`,
      data: { eventId, userId },
      emailOptionsFn: async (verifierId) => {
        const verifier = verifiers.find(
          (v) => v._id.toString() === verifierId.toString(),
        );
        return verifier
          ? {
            to: verifier.email,
            subject: `Co-host Nomination Approval Needed for ${event.title}`,
            html: `<p>Hi ${verifier.name},<br>A new co-host nomination for <b>${event.title}</b> requires your approval.</p>`,
          }
          : null;
      },
    });
    // Audit log
    console.log(
      `[AUDIT] Nominate co-host: host ${req.user.id} nominated user ${userId} for event ${eventId}`,
    );
    res.json({ message: 'Co-host nomination submitted.' });
  } catch (err) {
    console.error('Error in nominateCoHost:', err);
    res.status(500).json({ error: 'Error nominating co-host.' });
  }
}

// Approve co-host (verifier)
async function approveCoHost(req, res) {
  try {
    const { eventId, userId } = req.body;
    if (!eventId || !userId) {
      return res
        .status(400)
        .json({ error: 'eventId and userId are required.' });
    }
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    // Only verifier can approve
    if (
      !req.user.roles.includes('verifier') &&
      !req.user.roles.includes('platformAdmin')
    ) {
      return res
        .status(403)
        .json({
          error: 'Only verifiers or platform admins can approve co-hosts.',
        });
    }
    const reqIndex = event.coHostRequests.findIndex(
      (r) => r.userId.toString() === userId && r.status === 'pending',
    );
    if (reqIndex === -1)
      return res.status(404).json({ error: 'Co-host request not found.' });
    event.coHostRequests[reqIndex].status = 'approved';
    event.coHostRequests[reqIndex].approvedBy = req.user.id;
    event.coHostRequests[reqIndex].approvedAt = new Date();
    // Add to coHosts if not already present
    if (!event.coHosts.map((id) => id.toString()).includes(userId)) {
      event.coHosts.push(userId);
    }
    await event.save();
    // Notify approved user
    const approvedUser = await User.findById(userId);
    if (approvedUser) {
      await notifyUser({
        userId,
        type: 'cohost',
        message: `Your co-host nomination for ${event.title} has been approved.`,
        data: { eventId, eventTitle: event.title },
        emailOptions: {
          to: approvedUser.email,
          subject: `Co-host Nomination Approved for ${event.title}`,
          html: `<p>Hi ${approvedUser.name},<br>Your nomination as a co-host for <b>${event.title}</b> has been approved.</p>`,
        },
      });
    }
    // Audit log
    console.log(
      `[AUDIT] Approve co-host: verifier ${req.user.id} approved user ${userId} for event ${eventId}`,
    );
    res.json({ message: 'Co-host approved.' });
  } catch (err) {
    console.error('Error in approveCoHost:', err);
    res.status(500).json({ error: 'Error approving co-host.' });
  }
}

// Reject co-host (verifier)
async function rejectCoHost(req, res) {
  try {
    const { eventId, userId } = req.body;
    if (!eventId || !userId) {
      return res
        .status(400)
        .json({ error: 'eventId and userId are required.' });
    }
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    // Only verifier can reject
    if (
      !req.user.roles.includes('verifier') &&
      !req.user.roles.includes('platformAdmin')
    ) {
      return res
        .status(403)
        .json({
          error: 'Only verifiers or platform admins can reject co-hosts.',
        });
    }
    const reqIndex = event.coHostRequests.findIndex(
      (r) => r.userId.toString() === userId && r.status === 'pending',
    );
    if (reqIndex === -1)
      return res.status(404).json({ error: 'Co-host request not found.' });
    event.coHostRequests[reqIndex].status = 'rejected';
    event.coHostRequests[reqIndex].approvedBy = req.user.id;
    event.coHostRequests[reqIndex].approvedAt = new Date();
    await event.save();
    // Notify rejected user
    const rejectedUser = await User.findById(userId);
    if (rejectedUser) {
      await notifyUser({
        userId,
        type: 'cohost',
        message: `Your co-host nomination for ${event.title} has been rejected.`,
        data: { eventId, eventTitle: event.title },
        emailOptions: {
          to: rejectedUser.email,
          subject: `Co-host Nomination Rejected for ${event.title}`,
          html: `<p>Hi ${rejectedUser.name},<br>Your nomination as a co-host for <b>${event.title}</b> has been rejected by a verifier.</p>`,
        },
      });
    }
    // Audit log
    console.log(
      `[AUDIT] Reject co-host: verifier ${req.user.id} rejected user ${userId} for event ${eventId}`,
    );
    res.json({ message: 'Co-host rejected.' });
  } catch (err) {
    console.error('Error in rejectCoHost:', err);
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
    // Notify host of event verification result
    const host = await User.findById(event.hostUserId);
    if (host) {
      await notifyUser({
        userId: event.hostUserId,
        type: 'event_verification',
        message: `Your event '${event.title}' has been approved.`,
        data: { eventId: event._id, status: 'approved' },
        emailOptions: {
          to: host.email,
          subject: `Event Verification Approved: ${event.title}`,
          html: `<p>Hi ${host.name},<br>Your event <b>${event.title}</b> has been <b>approved</b> by a verifier.</p>`,
        },
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error verifying event.' });
  }
}

// Google Calendar link endpoint
async function getGoogleCalendarLink(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const start = new Date(event.schedule.start)
      .toISOString()
      .replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(event.schedule.end)
      .toISOString()
      .replace(/-|:|\.\d\d\d/g, '');
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
  cancelRsvp,
  getParticipants,
  scanQr,
  getEventAnalytics,
  nominateCoHost,
  approveCoHost,
  rejectCoHost,
  verifyEvent,
  getGoogleCalendarLink,
};
