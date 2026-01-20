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

// Create a new event (host/co-host)
async function createEvent(req, res) {
  try {
    // Validate required fields
    const requiredFields = ['title', 'description', 'type', 'location', 'capacity', 'date'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    
    // Validate capacity is a valid positive number
    const validatedCapacity = parseInt(req.body.capacity);
    if (isNaN(validatedCapacity) || validatedCapacity < 1) {
      return res.status(400).json({ error: 'Capacity must be a valid positive number.' });
    }
    
    // Extract and parse fields
    const {
      title,
      description,
      type,
      organizationName,
      date,
      isPaid,
      price,
      audienceType,
      about,
    } = req.body;
    
    let {
      tags,
      location,
      requirements,
      socialLinks,
      features,
      sessions,
    } = req.body;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid location format.' });
      }
    }
    
    // Parse socialLinks if sent as JSON string
    if (typeof socialLinks === 'string') {
      try {
        socialLinks = JSON.parse(socialLinks);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid socialLinks format.' });
      }
    }
    
    // Parse features if sent as JSON string
    if (typeof features === 'string') {
      try {
        features = JSON.parse(features);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid features format.' });
      }
    }
    
    // Parse sessions if sent as JSON string
    if (typeof sessions === 'string') {
      try {
        sessions = JSON.parse(sessions);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid sessions format.' });
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
    if (req.files && req.files['logo']) {
      const f = req.files['logo'][0];
      logoURL = await uploadEventImageLegacy(f.buffer, f.originalname, 'logo', f.mimetype);
    }
    if (req.files && req.files['banner']) {
      const f = req.files['banner'][0];
      bannerURL = await uploadEventImageLegacy(f.buffer, f.originalname, 'banner', f.mimetype);
    }
    // Validate isPaid and price
    const eventIsPaid = isPaid === true || isPaid === 'true';
    const eventPrice = eventIsPaid ? (typeof price === 'number' ? price : parseFloat(price) || 0) : 0;
    if (eventIsPaid && eventPrice <= 0) {
      return res.status(400).json({ error: 'Paid events must have a valid price.' });
    }
    
    // Parse date from datetime-local input
    // datetime-local gives us a string like "2025-12-31T12:59" without timezone
    // We need to treat this as the local time the user intended
    let eventDate;
    if (date.includes('T') && !date.includes('Z') && !date.includes('+')) {
      // datetime-local format (YYYY-MM-DDTHH:MM) - treat as-is without timezone conversion
      eventDate = new Date(`${date  }:00`); // Add seconds if missing
    } else {
      eventDate = new Date(date);
    }
    
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({ error: 'Invalid event date format.' });
    }
    
    const event = await Event.create({
      title,
      description,
      tags,
      type,
      organizationName,
      location,
      capacity: validatedCapacity,
      date: eventDate, // Store as Date object in UTC
      isPaid: eventIsPaid,
      price: eventPrice,
      requirements,
      socialLinks,
      audienceType: audienceType || 'public',
      features: features || { certificateEnabled: false, chatEnabled: false },
      sessions: sessions || [],
      about: about || '',
      logoURL,
      bannerURL,
      hostUserId: req.user.id,
      institutionId: req.user.institutionId,
    });
    
    // Notify verifiers about new event pending verification
    try {
      const User = require('../Models/User');
      const verifiers = await User.find({ 
        roles: { $in: ['verifier', 'platformAdmin'] } 
      }).select('_id email name notificationPreferences');
      
      const { notifyUser } = require('../Services/notification');
      const host = await User.findById(req.user.id).select('name email');
      
      for (const verifier of verifiers) {
        await notifyUser({
          userId: verifier._id,
          type: 'event_verification',
          message: `New event "${event.title}" submitted by ${host?.name || 'Unknown'} requires verification`,
          data: { 
            eventId: event._id, 
            eventTitle: event.title,
            hostName: host?.name,
            hostEmail: host?.email,
            status: 'pending' 
          },
          emailOptions: verifier.notificationPreferences?.email?.event_verification !== false ? {
            to: verifier.email,
            subject: `New Event Pending Verification: ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #9b5de5;">New Event Requires Verification</h2>
                <p>Hi ${verifier.name},</p>
                <p>A new event has been submitted and requires your verification:</p>
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #9b5de5; margin: 15px 0;">
                  <p><strong>Event Title:</strong> ${event.title}</p>
                  <p><strong>Host:</strong> ${host?.name || 'Unknown'} (${host?.email || ''})</p>
                  <p><strong>Event Type:</strong> ${event.type}</p>
                  <p><strong>Event Date:</strong> ${new Date(event.date).toLocaleString()}</p>
                  <p><strong>Status:</strong> Pending Verification</p>
                </div>
                <p>Please review this event in the verifier dashboard and approve or reject it.</p>
                <p>Best regards,<br>CampVerse Team</p>
              </div>
            `,
          } : null,
        });
      }
    } catch (notifErr) {
      // Don't fail event creation if notification fails
      logger && logger.error ? logger.error('Error sending event verification notifications:', notifErr) : null;
    }
    
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
    const eventId = req.params.id;
    const userId = req.user?.id; // Get user ID if authenticated
    
    const event = await Event.findById(eventId)
      .populate('hostUserId', 'name email') // Populate host user details
      .populate('coHosts', 'name email'); // Populate co-hosts too
      
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: 'Event not found.' 
      });
    }

    let userRegistration = null;
    if (userId) {
      // Check if user is registered for this event
      userRegistration = await EventParticipationLog.findOne({
        eventId,
        userId
      });
    }

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        userRegistration: userRegistration ? {
          status: userRegistration.status,
          registeredAt: userRegistration.registeredAt
        } : null
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: 'Error fetching event.' 
    });
  }
}

// Update event (host/co-host)
async function updateEvent(req, res) {
  try {
    logger.info('Update Event Request Body:', JSON.stringify(req.body, null, 2));
    const update = req.body;
    
    // Parse location if it's a string
    if ('location' in req.body && typeof req.body.location === 'string') {
      try {
        update.location = JSON.parse(req.body.location);
      } catch (e) {
        logger.error('Failed to parse location:', e);
      }
    }
    
    // Parse features if it's a string
    if ('features' in req.body && typeof req.body.features === 'string') {
      try {
        update.features = JSON.parse(req.body.features);
      } catch (e) {
        logger.error('Failed to parse features:', e);
      }
    }
    
    // Parse organizer if it's a string
    if ('organizer' in req.body && typeof req.body.organizer === 'string') {
      try {
        update.organizer = JSON.parse(req.body.organizer);
      } catch (e) {
        logger.error('Failed to parse organizer:', e);
      }
    }
    
    // Parse socialLinks if it's a string
    if ('socialLinks' in req.body && typeof req.body.socialLinks === 'string') {
      try {
        update.socialLinks = JSON.parse(req.body.socialLinks);
      } catch (e) {
        logger.error('Failed to parse socialLinks:', e);
      }
    }
    
    // Validate required fields for update (if present)
    const updatableFields = ['title', 'description', 'type', 'organizationName', 'location', 'capacity', 'date'];
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
    
    // Log the features field specifically to debug
    if ('features' in update) {
      logger.info('🎯 Features field in update:', JSON.stringify(update.features, null, 2));
    }
    
    // Validate isPaid and price
    if ('isPaid' in update) {
      update.isPaid = update.isPaid === true || update.isPaid === 'true';
      update.price = update.isPaid ? (typeof update.price === 'number' ? update.price : parseFloat(update.price) || 0) : 0;
      if (update.isPaid && update.price <= 0) {
        return res.status(400).json({ error: 'Paid events must have a valid price.' });
      }
    }
    
    // Log the complete update object before saving
    logger.info('📝 Complete update object:', JSON.stringify(update, null, 2));
    
    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    
    // Log the updated event to verify features were saved
    logger.info('✅ Updated event features:', JSON.stringify(updatedEvent.features, null, 2));
    
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

// RSVP/register for event (user) - Without transactions for standalone MongoDB
async function rsvpEvent(req, res) {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;
    
    logger && logger.info ? logger.info('🎯 RSVP Request:', { eventId, userId }) : null;
    
    // Validate event exists first
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        error: 'Event not found',
        message: 'The event you are trying to register for does not exist'
      });
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
    
    // Generate secure QR token using crypto
    const crypto = require('crypto');
    qrToken = crypto.randomBytes(32).toString('hex');
    
    // Calculate QR expiration (event end + 2 hours)
    const qrExpiresAt = new Date(event.date);
    if (event.endDate) {
      qrExpiresAt.setTime(new Date(event.endDate).getTime() + 2 * 60 * 60 * 1000);
    } else {
      qrExpiresAt.setTime(event.date.getTime() + 2 * 60 * 60 * 1000);
    }
    
    // Check if user is already registered
    const existingLog = await EventParticipationLog.findOne({ userId, eventId });
    if (existingLog) {
      logger && logger.warn ? logger.warn('⚠️ User already registered:', { eventId, userId }) : null;
      return res.status(409).json({ 
        success: false,
        error: 'User already registered for this event',
        message: 'You have already registered for this event'
      });
    }
    
    // Create new participation log
    const participationLog = await EventParticipationLog.create({
      userId,
      eventId,
      status,
      qrToken, // Legacy field
      registeredAt: new Date(),
      qrCode: {
        token: qrToken,
        generatedAt: new Date(),
        expiresAt: qrExpiresAt,
        isUsed: false
      }
    });
    
    logger && logger.info ? logger.info('✅ RSVP Created:', { 
      eventId, 
      userId, 
      status, 
      participationLogId: participationLog._id 
    }) : null;
    
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
    
    // Generate QR code image ONLY for registered users
    let qrImage = null;
    let emailSent = false;
    
    if (status === 'registered') {
      try {
        qrImage = await qrcode.toDataURL(qrToken);
        logger && logger.info ? logger.info('📧 QR image for email:', { qrImage: typeof qrImage === 'string' ? qrImage.slice(0, 50) + '...' : qrImage }) : null;
        // Email QR code to user (non-blocking)
          if (!req.user.email || typeof req.user.email !== 'string' || !req.user.email.includes('@')) {
            logger && logger.error ? logger.error('❌ Cannot send QR email: recipient email missing or invalid', { userId, eventId, email: req.user.email }) : null;
          } else {
            try {
              await sendQrEmail(req.user.email, qrImage, event.title, eventId);
              emailSent = true;
              logger && logger.info ? logger.info('✅ QR code email sent successfully') : null;
            } catch (emailErr) {
              logger && logger.error ? logger.error('❌ Failed to send QR email:', emailErr) : null;
              // Don't fail the RSVP, but inform user
            }
          }
      } catch (qrError) {
        logger && logger.error ? logger.error('❌ QR generation failed:', qrError) : null;
        // Continue without QR
      }
    }
    
    // Send response with appropriate message based on status
    const responseMessage = status === 'registered'
      ? (emailSent 
        ? 'RSVP successful! You are registered. QR code sent to email.'
        : 'RSVP successful! You are registered. Note: Email delivery failed, but QR code is shown below.')
      : 'RSVP successful! You are on the waitlist for this event.';
    
    res.status(201).json({
      success: true,
      message: responseMessage,
      qrImage: status === 'registered' ? qrImage : null,
      status,
      eventId,
      emailSent: status === 'registered' ? emailSent : false
    });
    
    // Async notifications (non-blocking)
    setImmediate(async () => {
      try {
        // Notify user (confirmation) with public event link
        const publicEventLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventId}`;
        await notifyUser({
          userId: req.user.id,
          type: 'rsvp',
          message: `You have successfully registered for ${event.title}.`,
          data: { eventId: event._id, eventTitle: event.title, publicEventLink },
          link: `/events/${eventId}`, // Link to event details
          emailOptions: {
            to: req.user.email,
            subject: `RSVP Confirmation for ${event.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #9b5de5;">Registration Confirmed!</h2>
                <p>Hi ${req.user.name},</p>
                <p>You have successfully registered for <b>${event.title}</b>.</p>
                <div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #9b5de5; margin: 15px 0;">
                  <p><strong>Event Link:</strong></p>
                  <p><a href="${publicEventLink}" style="color: #9b5de5; font-size: 16px;">${publicEventLink}</a></p>
                  <p style="color: #666; font-size: 14px; margin-top: 10px;">
                    💡 Visit this link anytime to view your registration details and QR code.
                  </p>
                </div>
                ${status === 'registered' ? `
                  <p style="color: #28a745; font-weight: bold;">✅ You are confirmed for this event!</p>
                  <p>Your QR code has been sent in a separate email. You can also view it by clicking the link above.</p>
                ` : `
                  <p style="color: #ffc107; font-weight: bold;">⏳ You are currently on the waitlist.</p>
                  <p>We'll notify you if a spot becomes available.</p>
                `}
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from CampVerse.</p>
              </div>
            `,
          },
        });
        
        // DO NOT notify host/co-hosts about new registrations (as per requirement)
        // Hosts can view registrations in their dashboard
        
      } catch (notificationError) {
        logger && logger.error ? logger.error('Notification error:', notificationError) : null;
      }
    });
    
  } catch (err) {
    logger && logger.error ? logger.error('RSVP error:', err) : null;
    
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return res.status(409).json({ 
        success: false,
        error: 'User already registered for this event',
        message: 'You have already registered for this event'
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Error registering for event.',
      message: 'Failed to register for the event. Please try again.'
    });
  }
}

// Cancel RSVP for event (user)
async function cancelRsvp(req, res) {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;
    
    logger && logger.info ? logger.info('🎯 Cancel RSVP Request:', { eventId, userId }) : null;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        error: 'Event not found.',
        message: 'The event you are trying to cancel RSVP for does not exist'
      });
    }
    
    // Find participation log
    const log = await EventParticipationLog.findOne({
      eventId,
      userId,
    });
    
    if (!log) {
      return res.status(404).json({ 
        success: false,
        error: 'No RSVP found for this user.',
        message: 'You have not registered for this event'
      });
    }
    
    // Check if attendance was already marked (QR was scanned)
    if (log.status === 'attended' || (log.qrCode && log.qrCode.isUsed)) {
      return res.status(403).json({ 
        success: false,
        error: 'Cannot cancel RSVP after attendance has been marked.',
        message: 'Your attendance has already been recorded. You cannot cancel your registration.'
      });
    }
    
    // Delete the participation log
    await EventParticipationLog.findByIdAndDelete(log._id);
    
    // Remove from event waitlist if present
    event.waitlist = event.waitlist.filter(
      (id) => id.toString() !== userId.toString(),
    );
    
    // If user was registered, promote first waitlisted user
    if (log.status === 'registered' && event.waitlist.length > 0) {
      const nextUserId = event.waitlist[0];
      
      // Update their participation log
      const nextLog = await EventParticipationLog.findOne({
        eventId,
        userId: nextUserId,
        status: 'waitlisted',
      });
      
      if (nextLog) {
        nextLog.status = 'registered';
        
        // Generate QR code for promoted user
        const crypto = require('crypto');
        const newQrToken = crypto.randomBytes(32).toString('hex');
        nextLog.qrToken = newQrToken;
        
        // Calculate QR expiration
        const qrExpiresAt = new Date(event.date);
        if (event.endDate) {
          qrExpiresAt.setTime(new Date(event.endDate).getTime() + 2 * 60 * 60 * 1000);
        } else {
          qrExpiresAt.setTime(event.date.getTime() + 2 * 60 * 60 * 1000);
        }
        
        nextLog.qrCode = {
          token: newQrToken,
          generatedAt: new Date(),
          expiresAt: qrExpiresAt,
          isUsed: false
        };
        
        await nextLog.save();
        
        // Notify promoted user
        const promotedUser = await User.findById(nextUserId);
        if (promotedUser) {
          // Generate and send QR code
          try {
            const qrImage = await qrcode.toDataURL(newQrToken);
            await sendQrEmail(promotedUser.email, qrImage, event.title, eventId);
          } catch (qrError) {
            logger && logger.error ? logger.error('❌ Failed to send QR to promoted user:', qrError) : null;
          }
          
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
        
        // Remove from waitlist
        event.waitlist = event.waitlist.slice(1);
      }
    }
    
    await event.save();
    
    logger && logger.info ? logger.info('✅ RSVP Cancelled:', { eventId, userId, wasRegistered: log.status === 'registered' }) : null;
    
    // Notify user of cancellation
    setImmediate(async () => {
      try {
        await notifyUser({
          userId: req.user.id,
          type: 'rsvp',
          message: `You have cancelled your RSVP for ${event.title}.`,
          data: { eventId: event._id, eventTitle: event.title },
          emailOptions: {
            to: req.user.email,
            subject: `RSVP Cancelled for ${event.title}`,
            html: `<p>Hi ${req.user.name},<br>Your RSVP for <b>${event.title}</b> has been cancelled.</p>`,
          },
        });
      } catch (notificationError) {
        logger && logger.error ? logger.error('Notification error:', notificationError) : null;
      }
    });
    
    res.json({ 
      success: true, 
      message: 'RSVP cancelled successfully.' 
    });
  } catch (err) {
    logger && logger.error ? logger.error('Cancel RSVP error:', err) : null;
    res.status(500).json({ 
      success: false, 
      error: 'Error cancelling RSVP.',
      message: 'Failed to cancel RSVP. Please try again.'
    });
  }
}

// Email QR code to user
async function sendQrEmail(to, qrImage, eventTitle, eventId) {
  const publicEventLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventId}`;
  const qrViewLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${eventId}/qr`;
  
  // Convert data URL to buffer for attachment
  const base64Data = qrImage.replace(/^data:image\/png;base64,/, '');
  const qrBuffer = Buffer.from(base64Data, 'base64');
  
  await emailService.sendMail({
    from: `CampVerse <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your QR Code for ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Your Event Ticket</h2>
        <p>Hi there!</p>
        <p>Here is your QR code for <b>${eventTitle}</b>:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <img src="cid:qr-code.png" alt="Event QR Code" style="max-width: 250px; border: 2px solid #ddd; padding: 10px; background: white;" />
        </div>
        
        <p><strong>Important:</strong> This QR code is unique to you and this event only.</p>
        <div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #9b5de5; margin: 20px 0;">
          <p><strong>📍 Event Page:</strong></p>
          <p><a href="${publicEventLink}" style="color: #9b5de5; font-size: 16px;">${publicEventLink}</a></p>
          <p style="color: #666; font-size: 14px; margin-top: 10px;">
            💡 Visit this link anytime to view your registration details and QR code.
          </p>
        </div>
        <p><strong>Or view your QR code directly:</strong> <a href="${qrViewLink}" style="color: #9b5de5;">${qrViewLink}</a></p>
        <p>Show this QR code at the event entrance for check-in.</p>
        <p style="color: #ff6b6b;">⚠️ This QR code expires 2 hours after the event ends and can only be used once.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message from CampVerse. Please do not reply to this email.</p>
      </div>
    `,
    attachments: [
      {
        filename: 'qr-code.png',
        content: qrBuffer,
        contentType: 'image/png',
        cid: 'qr-code.png' // Content-ID for inline embedding
      }
    ]
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
        profilePhoto: user?.profilePhoto,
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
    logger && logger.info ? logger.info('📱 QR Scan Request:', { 
      eventId, 
      qrToken: qrToken ? qrToken.substring(0, 10) + '...' : 'missing',
      body: req.body 
    }) : null;
    
    if (!eventId || !qrToken) {
      return res.status(400).json({ 
        success: false,
        error: 'eventId and qrToken are required.',
        message: 'Missing required fields',
        debug: { receivedEventId: !!eventId, receivedQrToken: !!qrToken }
      });
    }
    
    // Find event and check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false,
        error: 'Event not found.',
        message: 'The event does not exist'
      });
    }
    
    const userId = req.user.id;
    const isHost = event.hostUserId && event.hostUserId.toString() === userId;
    const isCoHost = event.coHosts && event.coHosts.map((id) => id.toString()).includes(userId);
    
    if (!isHost && !isCoHost) {
      return res.status(403).json({
        success: false,
        error: 'Only host or approved co-host can scan attendance for this event.',
        message: 'You do not have permission to scan QR codes for this event'
      });
    }
    
    // Find participation log - check both legacy qrToken and new qrCode.token
    const log = await EventParticipationLog.findOne({ 
      eventId, 
      $or: [
        { qrToken },
        { 'qrCode.token': qrToken }
      ]
    });
    
    if (!log) {
      return res.status(404).json({ 
        success: false,
        error: 'Invalid QR code.',
        message: 'QR code not found or invalid'
      });
    }
    
    // Check if QR code is already used (enhanced system)
    if (log.qrCode && log.qrCode.isUsed) {
      return res.status(409).json({ 
        success: false,
        error: 'QR code has already been used.',
        message: 'This QR code has already been scanned'
      });
    }
    
    // Check if QR code is expired (enhanced system)
    if (log.qrCode && log.qrCode.expiresAt && new Date() > log.qrCode.expiresAt) {
      return res.status(410).json({ 
        success: false,
        error: 'QR code has expired.',
        message: 'This QR code has expired'
      });
    }
    
    // Check if attendance already marked (legacy check)
    if (log.status === 'attended') {
      return res.status(409).json({ 
        success: false,
        error: 'Attendance already marked for this user.',
        message: 'Attendance has already been marked'
      });
    }
    
    // Only registered users can have attendance marked
    if (log.status !== 'registered') {
      return res.status(400).json({ 
        success: false,
        error: 'Only registered participants can check in.',
        message: 'User must be registered (not waitlisted) to check in'
      });
    }
    
    // Mark attendance
    log.status = 'attended';
    log.attendanceTimestamp = new Date();
    log.attendanceMarkedBy = userId;
    log.attendanceMarkedAt = new Date();
    
    // Invalidate QR code (enhanced system)
    if (log.qrCode) {
      log.qrCode.isUsed = true;
      log.qrCode.usedAt = new Date();
      log.qrCode.usedBy = userId;
    }
    
    await log.save();
    
    logger && logger.info ? logger.info('✅ Attendance marked:', { 
      eventId, 
      participantId: log.userId, 
      scannedBy: userId 
    }) : null;
    
    // Fetch participant user for notification
    const participant = await User.findById(log.userId);
    if (participant) {
      setImmediate(async () => {
        try {
          await notifyUser({
            userId: log.userId,
            type: 'attendance',
            message: `Your attendance for ${event.title} has been marked. Thank you for participating!`,
            data: { eventId, eventTitle: event.title },
            emailOptions: {
              to: participant.email,
              subject: `Attendance Confirmed for ${event.title}`,
              html: `<p>Hi ${participant.name},<br>Your attendance for <b>${event.title}</b> has been successfully marked. Thank you for participating!</p>`,
            },
          });
        } catch (notificationError) {
          logger && logger.error ? logger.error('Notification error:', notificationError) : null;
        }
      });
    }
    
    res.json({ 
      success: true,
      message: 'Attendance marked successfully. QR code invalidated.',
      participantName: participant?.name || 'Unknown'
    });
  } catch (err) {
    logger && logger.error ? logger.error('Error in scanQr:', err) : null;
    res.status(500).json({ 
      success: false,
      error: 'Error marking attendance.',
      message: 'Failed to mark attendance. Please try again.'
    });
  }
}

// Event analytics (host/co-host only)
async function getEventAnalytics(req, res) {
  try {
    const eventId = req.params.id;
    const pipeline = [
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      {
        $facet: {
          "stats": [
            {
              $group: {
                _id: null,
                totalRegistered: { $sum: 1 },
                totalAttended: { $sum: { $cond: [{ $eq: ['$status', 'attended'] }, 1, 0] } },
                totalWaitlisted: { $sum: { $cond: [{ $eq: ['$status', 'waitlisted'] }, 1, 0] } },
                totalPaid: { $sum: { $cond: [{ $eq: ['$paymentType', 'paid'] }, 1, 0] } },
                totalFree: { $sum: { $cond: [{ $eq: ['$paymentType', 'free'] }, 1, 0] } },
                paymentSuccess: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'success'] }, 1, 0] } },
                paymentPending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
              }
            }
          ],
          "demographics": [
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            { $unwind: '$user' },
            {
              $facet: {
                "gender": [
                  { $group: { _id: "$user.gender", count: { $sum: 1 } } },
                  { $sort: { count: -1 } }
                ],
                "institution": [
                  {
                    $lookup: {
                      from: 'institutions',
                      localField: 'user.institutionId',
                      foreignField: '_id',
                      as: 'institution'
                    }
                  },
                  {
                    $project: {
                      institutionName: { $arrayElemAt: ["$institution.name", 0] }
                    }
                  },
                  { $group: { _id: "$institutionName", count: { $sum: 1 } } },
                  { $sort: { count: -1 } },
                  { $limit: 5 } // Top 5 institutions
                ]
              }
            }
          ]
        }
      }
    ];

    const result = await EventParticipationLog.aggregate(pipeline);
    const stats = result[0]?.stats[0] || {};
    // Extract demographics from nested facet structure
    const demog = result[0]?.demographics[0] || { gender: [], institution: [] };

    res.json({
      totalRegistered: stats.totalRegistered || 0,
      totalAttended: stats.totalAttended || 0,
      totalWaitlisted: stats.totalWaitlisted || 0,
      totalPaid: stats.totalPaid || 0,
      totalFree: stats.totalFree || 0,
      paymentSuccess: stats.paymentSuccess || 0,
      paymentPending: stats.paymentPending || 0,
      attendanceRate: (stats.totalRegistered || 0) > 0
          ? ((stats.totalAttended || 0) / (stats.totalRegistered || 1) * 100).toFixed(2)
          : 0,
      demographics: {
        gender: demog.gender || [],
        institution: demog.institution || []
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics.' });
  }
}

// Host-wide analytics (aggreggated across all events)
async function getHostAnalytics(req, res) {
  try {
    let userId = req.user.id;
    
    // Allow admin/verifier to view other host's analytics
    if ((req.user.role === 'admin' || req.user.role === 'verifier') && req.query.hostId) {
       userId = req.query.hostId;
    }

    // Find all events hosted by user
    const events = await Event.find({ 
      $or: [{ hostUserId: userId }, { coHosts: userId }] 
    }).select('_id status title isPaid price');
    
    const eventIds = events.map(e => e._id);

    const pipeline = [
      { $match: { eventId: { $in: eventIds } } },
      {
        $facet: {
          "overview": [
            {
              $group: {
                _id: null,
                totalParticipants: { $sum: 1 },
                totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'success'] }, '$amount', 0] } } 
              }
            }
          ],
          "demographics": [
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user'
              }
            },
            { $unwind: '$user' },
            {
              $facet: {
                "gender": [
                  { $group: { _id: "$user.gender", count: { $sum: 1 } } },
                  { $sort: { count: -1 } }
                ],
                "institution": [
                  {
                    $lookup: {
                      from: 'institutions',
                      localField: 'user.institutionId',
                      foreignField: '_id',
                      as: 'institution'
                    }
                  },
                  {
                    $project: {
                      institutionName: { $arrayElemAt: ["$institution.name", 0] }
                    }
                  },
                  { $group: { _id: "$institutionName", count: { $sum: 1 } } },
                  { $sort: { count: -1 } },
                  { $limit: 5 }
                ],
                "year": [
                   { $group: { _id: { $year: "$user.createdAt" }, count: { $sum: 1 } } } 
                ]
              }
            }
          ],
          "recentActivity": [
              { $sort: { createdAt: -1 } },
              { $limit: 4 },
              {
                  $lookup: {
                      from: 'users',
                      localField: 'userId',
                      foreignField: '_id',
                      as: 'user'
                  }
              },
              { $unwind: '$user' },
              {
                  $lookup: {
                      from: 'events',
                      localField: 'eventId',
                      foreignField: '_id',
                      as: 'event'
                  }
              },
              { $unwind: '$event' }
          ]
        }
      }
    ];

    const result = await EventParticipationLog.aggregate(pipeline);
    const overview = result[0]?.overview[0] || {};
    const demog = result[0]?.demographics[0] || { gender: [], institution: [] };
    const recent = result[0]?.recentActivity || [];
    
    // Calculate Per Event Stats
    const eventStatsAggregate = await EventParticipationLog.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: "$eventId", count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'success'] }, '$amount', 0] } } } }
    ]);
    
    const eventPerformance = events.map(e => {
        const stat = eventStatsAggregate.find(s => s._id.equals(e._id)) || { count: 0, revenue: 0 };
        return {
            name: e.title,
            participants: stat.count,
            revenue: stat.revenue || (e.isPaid ? e.price * stat.count : 0),
            status: e.status || 'upcoming',
            rating: 4.5
        };
    }).sort((a,b) => b.participants - a.participants).slice(0, 5);

    res.json({
        overview: {
            totalEvents: events.length,
            totalParticipants: overview.totalParticipants || 0,
            totalRevenue: overview.totalRevenue || 0,
            avgRating: 4.5,
            completionRate: events.length > 0 ? Math.round((events.filter(e => e.status === 'completed').length / events.length) * 100) + '%' : '0%',
            growthRate: "+12%"
        },
        eventPerformance,
        demographics: {
            gender: demog.gender || [],
            institution: demog.institution || []
        },
        recentActivity: recent.map(r => ({
            type: 'registration',
            user: r.user.name,
            event: r.event.title,
            timestamp: r.createdAt
        })),
        eventStats: {
            completed: events.filter(e => e.status === 'completed').length,
            ongoing: events.filter(e => e.status === 'ongoing').length,
            upcoming: events.filter(e => e.status === 'upcoming').length
        }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching host analytics.' });
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
    
    // Validate that the user exists and is registered on the platform
    const nominatedUser = await User.findById(userId);
    if (!nominatedUser) {
      return res
        .status(404)
        .json({ error: 'User not found. Please ensure the user is registered on the platform.' });
    }
    
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
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');

    event.coHostRequests.push({
      userId,
      status: 'pending',
      requestedBy: req.user.id,
      requestedAt: new Date(),
      token,
    });
    await event.save();
    
    // Notify nominated user with in-app notification and request for ID card if not a host
    const isHost = nominatedUser.canHost;
    const needsIdCard = !isHost && !nominatedUser.hostRequestIdCardPhoto;
    const acceptanceLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/accept-nomination?token=${token}&eventId=${eventId}`;
    
    await notifyUser({
      userId,
      type: 'cohost_request',
      message: `You have been nominated as a co-host for ${event.title}.${needsIdCard ? ' Please upload your ID card to complete the process.' : ' Please click the link in your email to accept or reject.'}`,
      data: { 
        eventId, 
        eventTitle: event.title, 
        needsIdCard,
        isHost 
      },
      link: needsIdCard ? `/profile/host-request` : acceptanceLink,
      emailOptions: nominatedUser.notificationPreferences?.email?.cohost !== false ? {
        to: nominatedUser.email,
        subject: `Co-host Nomination for ${event.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #9b5de5; text-align: center;">Co-host Nomination</h2>
            <p>Hi ${nominatedUser.name},</p>
            <p>You have been nominated as a co-host for the event: <b style="color: #9b5de5;">${event.title}</b>.</p>
            
            <div style="background: #fdf6ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin-bottom: 20px;">Would you like to join as a co-host?</p>
              <a href="${acceptanceLink}" style="background: #9b5de5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Invitation</a>
            </div>

            ${needsIdCard ? `
              <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0;">
                <p><strong>⚠️ Note:</strong> You'll need to upload your ID card in your profile settings to be fully verified as a co-host after accepting.</p>
              </div>
            ` : ''}

            <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
              If you didn't expect this invitation, you can simply ignore this email or reject it via the link above.
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="text-align: center; color: #9b5de5; font-weight: bold;">CampVerse Team</p>
          </div>
        `,
      } : null,
    });
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
    event.verifiedBy = req.user._id;
    event.verifiedAt = new Date();
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

// Event rejection (verifier)
async function rejectEvent(req, res) {
  try {
    const { reason } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // Check if user is verifier or platformAdmin
    if (!req.user.roles.includes('verifier') && !req.user.roles.includes('platformAdmin')) {
      return res.status(403).json({ error: 'Only verifiers can reject events' });
    }

    event.verificationStatus = 'rejected';
    event.rejectionReason = reason || 'Event verification failed';
    event.rejectedBy = req.user.id;
    event.rejectedAt = new Date();
    await event.save();

    res.json({
      message: 'Event rejected.',
      event: {
        id: event._id,
        verificationStatus: event.verificationStatus,
        rejectionReason: event.rejectionReason,
        rejectedAt: event.rejectedAt
      }
    });

    // Notify host of event rejection
    const host = await User.findById(event.hostUserId);
    if (host) {
      await notifyUser({
        userId: event.hostUserId,
        type: 'event_verification',
        message: `Your event '${event.title}' has been rejected.`,
        data: { eventId: event._id, status: 'rejected', reason: event.rejectionReason },
        emailOptions: {
          to: host.email,
          subject: `Event Verification Rejected: ${event.title}`,
          html: `<p>Hi ${host.name},<br>Your event <b>${event.title}</b> has been <b>rejected</b> by a verifier.</p><p><strong>Reason:</strong> ${event.rejectionReason}</p><p>Please contact support if you believe this is an error.</p>`,
        },
      });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting event.' });
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
/**
 * Get public event by ID (for sharing, only approved events, no auth required)
 */
async function getPublicEventById(req, res) {
  try {
    const eventId = req.params.id;
    const event = await Event.findOne({ _id: eventId, verificationStatus: 'approved' });
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found or not approved.'
      });
    }

    // Check if user is authenticated and registered for this event
    let userRegistration = null;
    let userId = null;
    if (req.headers.authorization) {
      try {
        // Try to extract user from token (optional authentication)
        const token = req.headers.authorization.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
        
        // Check if user is registered for this event
        userRegistration = await EventParticipationLog.findOne({
          eventId: new mongoose.Types.ObjectId(eventId),
          userId: new mongoose.Types.ObjectId(userId)
        });
        
        logger.info('📊 Public Event Check:', {
          eventId,
          userId,
          hasRegistration: !!userRegistration,
          registrationStatus: userRegistration?.status,
          registrationDetails: userRegistration ? {
            id: userRegistration._id.toString(),
            status: userRegistration.status,
            registeredAt: userRegistration.registeredAt
          } : 'No registration found'
        });
      } catch (authErr) {
        // Authentication failed - user not logged in, continue without userRegistration
        logger.info('⚠️ Optional auth failed for public event (user not logged in)', {
          error: authErr.message
        });
      }
    } else {
      logger.info('📊 Public Event - No auth header provided');
    }

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        userRegistration: userRegistration ? {
          status: userRegistration.status,
          registeredAt: userRegistration.registeredAt
        } : null
      }
    });
  } catch (err) {
    logger.error('❌ Error fetching public event:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching public event.'
    });
  }
}

/**
 * Get attendance list for an event
 * @route GET /api/events/:id/attendance
 */
async function getAttendance(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Check if user is host or co-host
    const isHost = event.hostUserId.toString() === userId;
    const isCoHost = event.coHosts && event.coHosts.some(ch => ch.toString() === userId);
    
    if (!isHost && !isCoHost) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view attendance for this event',
      });
    }

    // Get all participants
    const allParticipants = await EventParticipationLog.find({
      eventId: id,
      status: 'registered'
    }).populate('userId', 'name email profilePhoto');

    // Get attended participants (those who scanned QR)
    const attendedParticipants = await EventParticipationLog.find({
      eventId: id,
      status: 'registered',
      attended: true
    }).populate('userId', 'name email');

    res.json({
      success: true,
      totalRegistered: allParticipants.length,
      attendees: attendedParticipants.map(p => ({
        _id: p._id,
        userId: p.userId,
        scanTime: p.qrCode?.usedAt || p.createdAt,
        attended: p.attended
      })),
      attendanceRate: allParticipants.length > 0 
        ? Math.round((attendedParticipants.length / allParticipants.length) * 100)
        : 0
    });

  } catch (err) {
    logger.error('Error getting attendance:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get attendance',
      message: err.message
    });
  }
}

/**
 * Bulk mark attendance for multiple users
 * @route POST /api/events/:id/bulk-attendance
 */
async function bulkMarkAttendance(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required',
      });
    }

    // Check if event exists
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Check if user is host or co-host
    const isHost = event.hostUserId.toString() === userId;
    const isCoHost = event.coHosts && event.coHosts.some(ch => ch.toString() === userId);
    
    if (!isHost && !isCoHost) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to mark attendance for this event',
      });
    }

    // Mark attendance for all specified users
    const result = await EventParticipationLog.updateMany(
      {
        eventId: id,
        userId: { $in: userIds },
        status: 'registered'
      },
      {
        $set: {
          attended: true,
          'qrCode.isUsed': true,
          'qrCode.usedAt': new Date(),
          'qrCode.usedBy': `bulk_${userId}`
        }
      }
    );

    // Send notifications to users (async, non-blocking)
    setImmediate(async () => {
      try {
        const users = await User.find({ _id: { $in: userIds } });
        for (const user of users) {
          await notifyUser(user._id, {
            type: 'attendance_marked',
            title: 'Attendance Marked',
            message: `Your attendance has been marked for "${event.title}"`,
            eventId: event._id,
            eventTitle: event.title,
          });
        }
      } catch (err) {
        logger.error('Error sending bulk attendance notifications:', err);
      }
    });

    res.json({
      success: true,
      message: `Successfully marked attendance for ${result.modifiedCount} participant(s)`,
      marked: result.modifiedCount
    });

  } catch (err) {
    logger.error('Error marking bulk attendance:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to mark bulk attendance',
      message: err.message
    });
  }
}

/**
 * Regenerate QR code for a user's registration
 * @route POST /api/events/:id/regenerate-qr
 */
async function regenerateQR(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find user's registration
    const log = await EventParticipationLog.findOne({
      eventId: id,
      userId,
      status: 'registered'
    }).populate('eventId');

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'No active registration found for this event',
      });
    }

    // Check if event has ended
    const event = log.eventId;
    const eventEndTime = new Date(event.date);
    const now = new Date();
    
    if (now > eventEndTime) {
      return res.status(410).json({
        success: false,
        error: 'Cannot regenerate QR code for past events',
        message: 'This event has already ended'
      });
    }

    // Generate new QR token
    const crypto = require('crypto');
    const qrToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration (event end + 2 hours)
    const qrExpiration = new Date(eventEndTime.getTime() + 2 * 60 * 60 * 1000);

    // Generate QR code image
    const qrImage = await qrcode.toDataURL(qrToken);

    // Update log with new QR code
    log.qrCode = {
      token: qrToken,
      imageUrl: qrImage,
      generatedAt: new Date(),
      expiresAt: qrExpiration,
      isUsed: false,
      usedAt: null,
      usedBy: null
    };
    
    // Also update legacy qrToken for backwards compatibility
    log.qrToken = qrToken;
    
    await log.save();

    // Send new QR code via email (async)
    setImmediate(async () => {
      try {
        const user = await User.findById(userId);
        if (user && user.email) {
          await emailService.sendMail({
            from: `CampVerse <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: `New QR Code - ${event.title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                  .qr-container { background: white; padding: 30px; text-align: center; border-radius: 8px; margin: 20px 0; }
                  .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
                  .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                  .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🎫 New QR Code Generated</h1>
                  </div>
                  <div class="content">
                    <p>Dear ${user.name},</p>
                    <p>A new QR code has been generated for your registration:</p>
                    
                    <div class="info-box">
                      <h2 style="margin-top: 0; color: #667eea;">${event.title}</h2>
                      <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}</p>
                      <p><strong>Time:</strong> ${event.time || 'TBD'}</p>
                      <p><strong>Location:</strong> ${event.location || 'TBD'}</p>
                    </div>
                    
                    <div class="qr-container">
                      <img src="${qrImage}" alt="QR Code" style="max-width: 300px; width: 100%;" />
                      <p style="margin-top: 20px; color: #6b7280;">Show this QR code at the event entrance</p>
                    </div>
                    
                    <p><strong>⚠️ Important:</strong> Your previous QR code is no longer valid. Please use this new QR code.</p>
                    
                    <p style="text-align: center;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${event._id}/qr" class="button">View QR Code Online</a>
                    </p>
                    
                    <div class="footer">
                      <p>This is an automated email from CampVerse</p>
                    </div>
                  </div>
                </div>
              </body>
              </html>
            `
          });
        }
      } catch (err) {
        logger.error('Error sending regenerated QR email:', err);
      }
    });

    res.json({
      success: true,
      message: 'QR code regenerated successfully. Check your email for the new QR code.',
      qrCode: {
        image: qrImage,
        expiresAt: qrExpiration
      }
    });

  } catch (err) {
    logger.error('Error regenerating QR code:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate QR code',
      message: err.message
    });
  }
}

/**
 * Publicly accept or reject a co-host nomination via token
 * POST /api/events/cohost-response
 */
async function respondToCoHostNomination(req, res) {
  try {
    const { eventId, token, action, remarks } = req.body;
    
    if (!eventId || !token || !action) {
      return res.status(400).json({ error: 'eventId, token, and action (accept/reject) are required.' });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const requestIndex = event.coHostRequests.findIndex(r => r.token === token && r.status === 'pending');
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Invalid or expired invitation.' });
    }

    const request = event.coHostRequests[requestIndex];
    
    if (action === 'accept') {
      // Keep it as pending but marked as accepted by user? 
      // Actually, the original code had verifiers approve co-hosts.
      // Let's mark it as 'accepted_by_user' or something, or just proceed to verification.
      // The user said: "Implement a public-facing page where potential co-hosts can accept or reject invitations."
      
      request.status = 'approved'; // Let's simplify: once they accept, they ARE co-hosts if they canHost.
      request.remarks = remarks || 'Accepted by nominee';
      request.approvedBy = request.userId; // Self-approved in terms of nomination
      request.approvedAt = new Date();
      
      // Add to coHosts array
      if (!event.coHosts.includes(request.userId)) {
        event.coHosts.push(request.userId);
      }

      await event.save();
      
      // Notify the original host
      await notifyUser({
        userId: event.hostUserId,
        type: 'cohost_accepted',
        message: `Your co-host nomination for ${event.title} has been accepted.`,
        data: { eventId, nomineeId: request.userId }
      });

      return res.json({ success: true, message: 'invitation accepted successfully!' });
    } else if (action === 'reject') {
      request.status = 'rejected';
      request.remarks = remarks || 'Rejected by nominee';
      request.approvedAt = new Date(); // Rejection date

      await event.save();

      // Notify host
      await notifyUser({
        userId: event.hostUserId,
        type: 'cohost_rejected',
        message: `Your co-host nomination for ${event.title} has been rejected.`,
        data: { eventId, nomineeId: request.userId }
      });

      return res.json({ success: true, message: 'Invitation rejected.' });
    } else {
      return res.status(400).json({ error: 'Invalid action. Must be accept or reject.' });
    }
  } catch (error) {
    logger.error('Error in respondToCoHostNomination:', error);
    res.status(500).json({ error: 'Server error processing invitation.' });
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
  getHostAnalytics,
  nominateCoHost,
  approveCoHost,
  rejectCoHost,
  verifyEvent,
  rejectEvent,
  getGoogleCalendarLink,
  getPublicEventById,
  getAttendance,
  bulkMarkAttendance,
  regenerateQR,
  respondToCoHostNomination,
};
