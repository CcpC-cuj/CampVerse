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
const mongoose = require('mongoose');
const Event = require('../Models/Event');
const User = require('../Models/User');
const EventParticipationLog = require('../Models/EventParticipationLog');
const {
  uploadEventImage: uploadEventImageLegacy,
  deleteEventImage,
} = require('../Services/driveService');
const qrcode = require('qrcode');
const { createEmailService } = require('../Services/email');
const emailService = createEmailService();
const { notifyUser, notifyUsers } = require('../Services/notification');
const { logger } = require('../Middleware/errorHandler');
const { unifiedStorageService } = require('../Services/driveService');

// Create a new event (host/co-host)
async function createEvent(req, res) {
  try {
    // Validate required fields
    const requiredFields = ['title', 'description', 'type', 'organizer', 'location', 'capacity', 'date'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    if (!req.files || !req.files['banner']) {
      return res.status(400).json({ error: 'Banner image is required.' });
    }
    // Extract and parse fields
    let {
      title,
      description,
      tags,
      type,
      organizer,
      location,
      capacity,
      date,
      isPaid,
      price,
      requirements,
      socialLinks,
    } = req.body;
    // Parse organizer/location if sent as JSON strings (FormData)
    if (typeof organizer === 'string') {
      try {
        organizer = JSON.parse(organizer);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid organizer format.' });
      }
    }
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid location format.' });
      }
    }
    
    // Parse tags - handle string, array with stringified JSON, or proper array
    if (typeof tags === 'string') {
      try {
        tags = JSON.parse(tags);
      } catch (e) {
        // If not valid JSON, treat as comma-separated string
        tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      }
    } else if (Array.isArray(tags)) {
      // Handle array containing stringified JSON
      tags = tags.map(tag => {
        if (typeof tag === 'string') {
          try {
            const parsed = JSON.parse(tag);
            return Array.isArray(parsed) ? parsed : [tag];
          } catch (e) {
            return tag;
          }
        }
        return tag;
      }).flat().filter(tag => tag && tag.length > 0);
    }
    
    // Parse requirements - handle string, array with stringified JSON, or proper array
    if (typeof requirements === 'string') {
      try {
        requirements = JSON.parse(requirements);
      } catch (e) {
        // If not valid JSON, treat as newline-separated string
        requirements = requirements.split('\n').map(req => req.trim()).filter(req => req.length > 0);
      }
    } else if (Array.isArray(requirements)) {
      // Handle array containing stringified JSON
      requirements = requirements.map(req => {
        if (typeof req === 'string') {
          try {
            const parsed = JSON.parse(req);
            return Array.isArray(parsed) ? parsed : [req];
          } catch (e) {
            return req;
          }
        }
        return req;
      }).flat().filter(req => req && req.length > 0);
    }
    let logoURL, bannerURL;
    // File upload using storage service
    if (req.files['logo']) {
      const f = req.files['logo'][0];
      logoURL = await uploadEventImageLegacy(f.buffer, f.originalname, 'logo', f.mimetype);
    }
    if (req.files['banner']) {
      const f = req.files['banner'][0];
      bannerURL = await uploadEventImageLegacy(f.buffer, f.originalname, 'banner', f.mimetype);
    }
    // Validate isPaid and price
    let eventIsPaid = isPaid === true || isPaid === 'true';
    let eventPrice = eventIsPaid ? (typeof price === 'number' ? price : parseFloat(price) || 0) : 0;
    if (eventIsPaid && eventPrice <= 0) {
      return res.status(400).json({ error: 'Paid events must have a valid price.' });
    }
    const event = await Event.create({
      title,
      description,
      tags,
      type,
      organizer,
      location,
      capacity,
      date,
      isPaid: eventIsPaid,
      price: eventPrice,
      requirements,
      socialLinks,
      logoURL,
      bannerURL,
      hostUserId: req.user.id,
      institutionId: req.user.institutionId,
    });
    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      res.status(500).json({ error: 'Error creating event.', details: err?.message || err });
    } else {
      logger && logger.error ? logger.error('Error creating event:', err) : null;
      res.status(500).json({ error: 'Error creating event.' });
    }
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
    console.log('Update Event Request Body:', JSON.stringify(req.body, null, 2));
    const update = req.body;
    // Validate required fields for update (if present)
    const updatableFields = ['title', 'description', 'type', 'organizer', 'location', 'capacity', 'date'];
    for (const field of updatableFields) {
      if (field in update && !update[field]) {
        return res.status(400).json({ error: `Field cannot be empty: ${field}` });
      }
    }
    // Parse and update tags if present
    if ('tags' in req.body) {
      let tags = req.body.tags;
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags);
        } catch (e) {
          tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
      } else if (Array.isArray(tags)) {
        // Handle array containing stringified JSON
        tags = tags.map(tag => {
          if (typeof tag === 'string') {
            try {
              const parsed = JSON.parse(tag);
              return Array.isArray(parsed) ? parsed : [tag];
            } catch (e) {
              return tag;
            }
          }
          return tag;
        }).flat().filter(tag => tag && tag.length > 0);
      }
      update.tags = tags;
    }
    
    // Parse and update requirements if present
    if ('requirements' in req.body) {
      let requirements = req.body.requirements;
      if (typeof requirements === 'string') {
        try {
          requirements = JSON.parse(requirements);
        } catch (e) {
          requirements = requirements.split('\n').map(req => req.trim()).filter(req => req.length > 0);
        }
      } else if (Array.isArray(requirements)) {
        // Handle array containing stringified JSON
        requirements = requirements.map(req => {
          if (typeof req === 'string') {
            try {
              const parsed = JSON.parse(req);
              return Array.isArray(parsed) ? parsed : [req];
            } catch (e) {
              return req;
            }
          }
          return req;
        }).flat().filter(req => req && req.length > 0);
      }
      update.requirements = requirements;
    }
    
    // Parse and update sessions if present - preserve line breaks and formatting
    if ('sessions' in req.body) {
      let sessions = req.body.sessions;
      if (typeof sessions === 'string') {
        // Split by lines and preserve each line as separate array element
        sessions = sessions.split('\n').filter(s => s.trim().length > 0);
      } else if (Array.isArray(sessions)) {
        // If already array, keep as is but filter empty entries
        sessions = sessions.filter(s => s && s.trim().length > 0);
      }
      update.sessions = sessions;
    }
    
    // Only allow socialLinks to be updated if present
    if ('socialLinks' in req.body) update.socialLinks = req.body.socialLinks;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (req.files && req.files['logo']) {
      if (event.logoURL) await deleteEventImage(event.logoURL);
      const f = req.files['logo'][0];
      update.logoURL = await uploadEventImageLegacy(f.buffer, f.originalname, 'logo', f.mimetype);
    }
    if (req.files && req.files['banner']) {
      if (event.bannerURL) await deleteEventImage(event.bannerURL);
      const f = req.files['banner'][0];
      update.bannerURL = await uploadEventImageLegacy(f.buffer, f.originalname, 'banner', f.mimetype);
    }
    update.updatedAt = new Date();
    // Validate isPaid and price
    if ('isPaid' in update) {
      update.isPaid = update.isPaid === true || update.isPaid === 'true';
      update.price = update.isPaid ? (typeof update.price === 'number' ? update.price : parseFloat(update.price) || 0) : 0;
      if (update.isPaid && update.price <= 0) {
        return res.status(400).json({ error: 'Paid events must have a valid price.' });
      }
    }
    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(updatedEvent);
  } catch (err) {
  logger && logger.error ? logger.error('Error updating event:', err) : null;
    res.status(500).json({ error: 'Error updating event.' });
  }
}

// Delete event (host/co-host)
async function deleteEvent(req, res) {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    // Delete associated files from storage
    if (event.logoURL) await deleteEventImage(event.logoURL);
    if (event.bannerURL) await deleteEventImage(event.bannerURL);
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting event.' });
  }
}

// RSVP/register for event (user) - Fixed race condition with atomic operations
async function rsvpEvent(req, res) {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;
    
    // Check if user already registered
    const existingLog = await EventParticipationLog.findOne({
      eventId,
      userId
    });
    
    if (existingLog) {
      return res.status(409).json({ error: 'User already registered for this event' });
    }
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check capacity and determine status
    let status = 'registered';
    let qrToken = null;
    
    if (event.capacity) {
      const registeredCount = await EventParticipationLog.countDocuments({
        eventId,
        status: 'registered'
      });
      
      if (registeredCount >= event.capacity) {
        status = 'waitlisted';
      }
    }
    
    // Generate secure QR token
    const crypto = require('crypto');
    qrToken = crypto.randomBytes(32).toString('hex');
    
    // Create participation log
    await EventParticipationLog.create({
      userId,
      eventId,
      status,
      qrToken,
      registeredAt: new Date()
    });
    
    // Update event waitlist
    if (status === 'waitlisted') {
      await Event.findByIdAndUpdate(
        eventId,
        { $addToSet: { waitlist: userId } }
      );
    } else {
      // Remove from waitlist if previously waitlisted
      await Event.findByIdAndUpdate(
        eventId,
        { $pull: { waitlist: userId } }
      );
    }
    
    // Generate QR code image
    const qrImage = await qrcode.toDataURL(qrToken);
    
    // Send response
    res.status(201).json({
      message: `RSVP successful. Status: ${status}. QR code sent to email.`,
      qrImage,
      status
    });
    
    // Email QR code to user (non-blocking)
    try {
      await sendQrEmail(req.user.email, qrImage, event.title);
  // Audit: QR code email sent successfully
    } catch (emailErr) {
  logger && logger.error ? logger.error('Failed to send QR email:', emailErr) : null;
      // Don't fail the RSVP, just log the email error
    }
    
    // Async notifications (non-blocking)
    setImmediate(async () => {
      try {
        // Notify user (confirmation)
        await notifyUser({
          userId: req.user.id,
          type: 'rsvp',
          message: `You have successfully registered for ${event.title}.`,
          data: { eventId: event._id, eventTitle: event.title },
          emailOptions: {
            to: req.user.email,
            subject: `RSVP Confirmation for ${event.title}`,
            html: `<p>Hi ${req.user.name},<br>You have successfully registered for <b>${event.title}</b>.</p>`,
          },
        });
        
        // Notify host/co-hosts (new registration)
        const hostAndCoHosts = [event.hostUserId, ...(event.coHosts || [])]
          .filter((id) => id != null)
          .map((id) => String(id))
          .filter((id) => id !== req.user.id);
          
        if (hostAndCoHosts.length > 0) {
          await notifyUsers({
            userIds: hostAndCoHosts,
            type: 'rsvp',
            message: `${req.user.name} has registered for your event: ${event.title}.`,
            data: { eventId: event._id, userId: req.user.id },
            emailOptionsFn: async () => null,
          });
        }
      } catch (notificationError) {
  logger && logger.error ? logger.error('Notification error:', notificationError) : null;
      }
    });
    
  } catch (err) {
  logger && logger.error ? logger.error('RSVP error:', err) : null;
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
  // Audit: Cancel RSVP: user ${userId} for event ${eventId}
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
  // Audit: Scan QR: user ${userId} scanned for event ${eventId}, participant ${log.userId}, log ${log._id}
    res.json({ message: 'Attendance marked.' });
  } catch (err) {
  logger && logger.error ? logger.error('Error in scanQr:', err) : null;
    res.status(500).json({ error: 'Error marking attendance.' });
  }
}

// Event analytics (host/co-host only)
async function getEventAnalytics(req, res) {
  try {
    const eventId = req.params.id;
    const pipeline = [
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $group: {
          _id: null,
          totalRegistered: { $sum: 1 },
          totalAttended: {
            $sum: {
              $cond: [{ $eq: ['$status', 'attended'] }, 1, 0]
            }
          },
          totalWaitlisted: {
            $sum: {
              $cond: [{ $eq: ['$status', 'waitlisted'] }, 1, 0]
            }
          },
          totalPaid: {
            $sum: {
              $cond: [{ $eq: ['$paymentType', 'paid'] }, 1, 0]
            }
          },
          totalFree: {
            $sum: {
              $cond: [{ $eq: ['$paymentType', 'free'] }, 1, 0]
            }
          },
          paymentSuccess: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'success'] }, 1, 0]
            }
          },
          paymentPending: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0]
            }
          }
        }
      }
    ];
    const result = await EventParticipationLog.aggregate(pipeline);
    const stats = result[0] || {};
    res.json({
      totalRegistered: stats.totalRegistered || 0,
      totalAttended: stats.totalAttended || 0,
      totalWaitlisted: stats.totalWaitlisted || 0,
      totalPaid: stats.totalPaid || 0,
      totalFree: stats.totalFree || 0,
      paymentSuccess: stats.paymentSuccess || 0,
      paymentPending: stats.paymentPending || 0,
      attendanceRate:
        (stats.totalRegistered || 0) > 0
          ? ((stats.totalAttended || 0) / (stats.totalRegistered || 1) * 100).toFixed(2)
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
  // Audit: Nominate co-host: host ${req.user.id} nominated user ${userId} for event ${eventId}
    res.json({ message: 'Co-host nomination submitted.' });
  } catch (err) {
  logger && logger.error ? logger.error('Error in nominateCoHost:', err) : null;
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
  // Audit: Approve co-host: verifier ${req.user.id} approved user ${userId} for event ${eventId}
    res.json({ message: 'Co-host approved.' });
  } catch (err) {
  logger && logger.error ? logger.error('Error in approveCoHost:', err) : null;
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
  // Audit: Reject co-host: verifier ${req.user.id} rejected user ${userId} for event ${eventId}
    res.json({ message: 'Co-host rejected.' });
  } catch (err) {
  logger && logger.error ? logger.error('Error in rejectCoHost:', err) : null;
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
    // Treat as an all-day event on the given date
    const startDate = new Date(event.date);
    const startAllDay = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endAllDay = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate() + 1));
    const formatYmd = (d) => d.toISOString().slice(0,10).replace(/-/g, '');
    const start = formatYmd(startAllDay);
    const end = formatYmd(endAllDay);
    const locationText = event.organizer?.name || '';
    const link = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${start}/${end}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(locationText)}`;
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
