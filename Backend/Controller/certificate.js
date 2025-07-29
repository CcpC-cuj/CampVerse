const Certificate = require('../Models/Certificate');
const User = require('../Models/User');
const Event = require('../Models/Event');
const EventParticipationLog = require('../Models/EventParticipationLog');
const Institution = require('../Models/Institution');
const axios = require('axios');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer'); // Added for email notifications
const { notifyUser } = require('../Services/notification');

// ML Certificate Generation API Configuration
const ML_API_CONFIG = {
  baseURL: process.env.ML_CERTIFICATE_API_URL || 'https://ml-certificate-api.example.com',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.ML_API_KEY || ''}`
  }
};

/**
 * Generate certificate data for ML API
 */
async function prepareCertificateData(userId, eventId, certificateType) {
  try {
    // Fetch user, event, and participation data
    const [user, event, participationLog] = await Promise.all([
      User.findById(userId).populate('institutionId'),
      Event.findById(eventId).populate('hostUserId'),
      EventParticipationLog.findOne({ userId, eventId, status: 'attended' })
    ]);

    if (!user || !event || !participationLog) {
      throw new Error('User, event, or attendance data not found');
    }

    // Generate QR code for certificate verification
    const qrData = JSON.stringify({
      certificateId: `cert_${userId}_${eventId}_${Date.now()}`,
      userId: userId.toString(),
      eventId: eventId.toString(),
      issuedAt: new Date().toISOString()
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // Prepare certificate data for ML API
    const certificateData = {
      userName: user.name,
      userEmail: user.email,
      eventTitle: event.title,
      eventDescription: event.description,
      eventDate: event.schedule.start,
      eventLocation: event.location || 'Online',
      organizerName: event.hostUserId ? event.hostUserId.name : event.organizer,
      institutionName: user.institutionId ? user.institutionId.name : 'Unknown Institution',
      certificateType: certificateType,
      userSkills: user.skills || [],
      eventTags: event.tags || [],
      attendanceDate: participationLog.attendanceTimestamp,
      qrCode: qrCode,
      // Additional metadata for ML processing
      eventDuration: event.schedule.end - event.schedule.start,
      userInterests: user.interests || [],
      eventType: event.type,
      isPaid: event.isPaid,
      price: event.price
    };

    return certificateData;
  } catch (error) {
    console.error('Error preparing certificate data:', error);
    throw error;
  }
}

/**
 * Send certificate data to ML API for generation
 */
async function sendToMLAPI(certificateData) {
  try {
    const response = await axios.post(
      `${ML_API_CONFIG.baseURL}/generate-certificate`,
      certificateData,
      {
        timeout: ML_API_CONFIG.timeout,
        headers: ML_API_CONFIG.headers
      }
    );

    return {
      success: true,
      requestId: response.data.requestId,
      certificateURL: response.data.certificateURL,
      generationStatus: 'generated'
    };
  } catch (error) {
    console.error('ML API Error:', error.response?.data || error.message);
    return {
      success: false,
      requestId: null,
      errorMessage: error.response?.data?.message || error.message,
      generationStatus: 'failed'
    };
  }
}

/**
 * Generate certificate for attended user
 */
async function generateCertificate(req, res) {
  try {
    const { userId, eventId, certificateType = 'participant' } = req.body;
    const requesterId = req.user.id;

    // Validate inputs
    if (!userId || !eventId) {
      return res.status(400).json({ error: 'User ID and Event ID are required' });
    }

    // Check if user has permission (host, co-host, or platform admin)
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isHost = event.hostUserId.toString() === requesterId;
    const isCoHost = event.coHosts.includes(requesterId);
    const isAdmin = req.user.roles.includes('platformAdmin');

    if (!isHost && !isCoHost && !isAdmin) {
      return res.status(403).json({ error: 'Only event hosts, co-hosts, or admins can generate certificates' });
    }

    // Check if user attended the event
    const participationLog = await EventParticipationLog.findOne({
      userId,
      eventId,
      status: 'attended'
    });

    if (!participationLog) {
      return res.status(400).json({ error: 'User must have attended the event to receive a certificate' });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ userId, eventId });
    if (existingCertificate) {
      return res.status(400).json({ error: 'Certificate already exists for this user and event' });
    }

    // Prepare certificate data
    const certificateData = await prepareCertificateData(userId, eventId, certificateType);

    // Create certificate record
    const certificate = new Certificate({
      userId,
      eventId,
      type: certificateType,
      status: 'pending',
      certificateData
    });

    // Send to ML API
    const mlResponse = await sendToMLAPI(certificateData);

    // Update certificate with ML API response
    certificate.mlApiResponse = {
      requestId: mlResponse.requestId,
      generationStatus: mlResponse.generationStatus,
      errorMessage: mlResponse.errorMessage,
      generatedAt: new Date()
    };

    if (mlResponse.success) {
      certificate.status = 'generated';
      certificate.certificateURL = mlResponse.certificateURL;
      // Notify user of certificate generation
      const user = await User.findById(userId);
      if (user) {
        await notifyUser({
          userId,
          type: 'certificate',
          message: `Your certificate for ${event.title} is ready!`,
          data: { eventId, certificateId: certificate._id, certificateURL: certificate.certificateURL },
          emailOptions: {
            to: user.email,
            subject: `Your Certificate for ${event.title} is Ready!`,
            html: `<h2>🎉 Your Certificate is Ready!</h2><p>Dear ${user.name},</p><p>Your certificate for <strong>${event.title}</strong> has been generated and is now available.</p><p><strong>Certificate Type:</strong> ${certificate.type}</p><p>You can view and download your certificate from your CampVerse dashboard.</p><br><p>Best regards,<br>CampVerse Team</p>`
          }
        });
      }
    } else {
      certificate.status = 'failed';
    }

    await certificate.save();

    return res.status(201).json({
      message: 'Certificate generation initiated',
      certificate: {
        id: certificate._id,
        status: certificate.status,
        type: certificate.type,
        certificateURL: certificate.certificateURL,
        issuedAt: certificate.issuedAt
      }
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    return res.status(500).json({ error: 'Error generating certificate' });
  }
}

/**
 * Generate certificates for all attended users (batch processing)
 */
async function generateBatchCertificates(req, res) {
  try {
    const { eventId, certificateType = 'participant' } = req.body;
    const requesterId = req.user.id;

    // Validate inputs
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isHost = event.hostUserId.toString() === requesterId;
    const isCoHost = event.coHosts.includes(requesterId);
    const isAdmin = req.user.roles.includes('platformAdmin');

    if (!isHost && !isCoHost && !isAdmin) {
      return res.status(403).json({ error: 'Only event hosts, co-hosts, or admins can generate batch certificates' });
    }

    // Get all attended users for the event
    const attendedUsers = await EventParticipationLog.find({
      eventId,
      status: 'attended'
    }).populate('userId', 'name email');

    if (attendedUsers.length === 0) {
      return res.status(400).json({ error: 'No attended users found for this event' });
    }

    const results = {
      total: attendedUsers.length,
      generated: 0,
      skipped: 0,
      failed: 0,
      certificates: []
    };

    // Process each attended user
    for (const attendance of attendedUsers) {
      try {
        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({ 
          userId: attendance.userId._id, 
          eventId 
        });

        if (existingCertificate) {
          results.skipped++;
          results.certificates.push({
            userId: attendance.userId._id,
            userName: attendance.userId.name,
            userEmail: attendance.userId.email,
            status: 'skipped',
            reason: 'Certificate already exists'
          });
          continue;
        }

        // Prepare certificate data
        const certificateData = await prepareCertificateData(
          attendance.userId._id, 
          eventId, 
          certificateType
        );

        // Create certificate record
        const certificate = new Certificate({
          userId: attendance.userId._id,
          eventId,
          type: certificateType,
          status: 'pending',
          certificateData
        });

        // Send to ML API
        const mlResponse = await sendToMLAPI(certificateData);

        // Update certificate with ML API response
        certificate.mlApiResponse = {
          requestId: mlResponse.requestId,
          generationStatus: mlResponse.generationStatus,
          errorMessage: mlResponse.errorMessage,
          generatedAt: new Date()
        };

        if (mlResponse.success) {
          certificate.status = 'generated';
          certificate.certificateURL = mlResponse.certificateURL;
          results.generated++;
        } else {
          certificate.status = 'failed';
          results.failed++;
        }

        await certificate.save();

        results.certificates.push({
          userId: attendance.userId._id,
          userName: attendance.userId.name,
          userEmail: attendance.userId.email,
          status: certificate.status,
          certificateId: certificate._id,
          certificateURL: certificate.certificateURL
        });

      } catch (error) {
        console.error(`Error generating certificate for user ${attendance.userId._id}:`, error);
        results.failed++;
        results.certificates.push({
          userId: attendance.userId._id,
          userName: attendance.userId.name,
          userEmail: attendance.userId.email,
          status: 'failed',
          reason: error.message
        });
      }
    }

    return res.status(200).json({
      message: 'Batch certificate generation completed',
      eventId,
      eventTitle: event.title,
      results
    });

  } catch (error) {
    console.error('Batch certificate generation error:', error);
    return res.status(500).json({ error: 'Error generating batch certificates' });
  }
}

/**
 * Get user's certificates
 */
async function getUserCertificates(req, res) {
  try {
    const userId = req.params.userId || req.user.id;
    const certificates = await Certificate.find({ userId })
      .populate('eventId', 'title description schedule')
      .sort({ issuedAt: -1 });

    return res.json({ certificates });
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    return res.status(500).json({ error: 'Error fetching certificates' });
  }
}

/**
 * Get certificate by ID
 */
async function getCertificateById(req, res) {
  try {
    const certificateId = req.params.id;
    const certificate = await Certificate.findById(certificateId)
      .populate('userId', 'name email')
      .populate('eventId', 'title description schedule organizer');

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    return res.json({ certificate });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return res.status(500).json({ error: 'Error fetching certificate' });
  }
}

/**
 * Verify certificate using QR code
 */
async function verifyCertificate(req, res) {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    // Decode QR code data
    let qrData;
    try {
      qrData = JSON.parse(qrCode);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    // Find certificate
    const certificate = await Certificate.findOne({
      userId: qrData.userId,
      eventId: qrData.eventId
    }).populate('userId', 'name email')
      .populate('eventId', 'title description schedule');

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (certificate.status !== 'generated') {
      return res.status(400).json({ error: 'Certificate not yet generated' });
    }

    return res.json({
      valid: true,
      certificate: {
        userName: certificate.userId.name,
        userEmail: certificate.userId.email,
        eventTitle: certificate.eventId.title,
        eventDate: certificate.eventId.schedule.start,
        certificateType: certificate.type,
        issuedAt: certificate.issuedAt,
        certificateURL: certificate.certificateURL
      }
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    return res.status(500).json({ error: 'Error verifying certificate' });
  }
}

/**
 * Export attended users for ML certificate generation (batch processing)
 */
async function exportAttendedUsers(req, res) {
  try {
    const { eventId } = req.params;
    const requesterId = req.user.id;

    // Check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isHost = event.hostUserId.toString() === requesterId;
    const isCoHost = event.coHosts.includes(requesterId);
    const isAdmin = req.user.roles.includes('platformAdmin');

    if (!isHost && !isCoHost && !isAdmin) {
      return res.status(403).json({ error: 'Only event hosts, co-hosts, or admins can export attended users' });
    }

    // Get all attended users for the event
    const attendedUsers = await EventParticipationLog.find({
      eventId,
      status: 'attended'
    }).populate('userId', 'name email skills interests')
      .populate('eventId', 'title description schedule tags type');

    // Prepare data for ML API
    const exportData = {
      eventId: eventId,
      eventTitle: event.title,
      eventDescription: event.description,
      eventDate: event.schedule.start,
      eventLocation: event.location || 'Online',
      organizerName: event.organizer,
      totalAttended: attendedUsers.length,
      attendedUsers: attendedUsers.map(log => ({
        userId: log.userId._id,
        userName: log.userId.name,
        userEmail: log.userId.email,
        userSkills: log.userId.skills || [],
        userInterests: log.userId.interests || [],
        attendanceDate: log.attendanceTimestamp,
        certificateType: 'participant' // Default type
      }))
    };

    return res.json({
      message: 'Attended users exported successfully',
      data: exportData,
      count: attendedUsers.length
    });

  } catch (error) {
    console.error('Export attended users error:', error);
    return res.status(500).json({ error: 'Error exporting attended users' });
  }
}

/**
 * Retry failed certificate generation
 */
async function retryCertificateGeneration(req, res) {
  try {
    const { certificateId } = req.params;
    const requesterId = req.user.id;

    const certificate = await Certificate.findById(certificateId)
      .populate('eventId');

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Check permissions
    const isHost = certificate.eventId.hostUserId.toString() === requesterId;
    const isCoHost = certificate.eventId.coHosts.includes(requesterId);
    const isAdmin = req.user.roles.includes('platformAdmin');

    if (!isHost && !isCoHost && !isAdmin) {
      return res.status(403).json({ error: 'Only event hosts, co-hosts, or admins can retry certificate generation' });
    }

    if (certificate.status !== 'failed') {
      return res.status(400).json({ error: 'Certificate is not in failed status' });
    }

    // Retry ML API call
    const mlResponse = await sendToMLAPI(certificate.certificateData);

    // Update certificate
    certificate.mlApiResponse = {
      requestId: mlResponse.requestId,
      generationStatus: mlResponse.generationStatus,
      errorMessage: mlResponse.errorMessage,
      generatedAt: new Date()
    };

    if (mlResponse.success) {
      certificate.status = 'generated';
      certificate.certificateURL = mlResponse.certificateURL;
    }

    await certificate.save();

    return res.json({
      message: 'Certificate generation retry completed',
      status: certificate.status,
      certificateURL: certificate.certificateURL
    });

  } catch (error) {
    console.error('Retry certificate generation error:', error);
    return res.status(500).json({ error: 'Error retrying certificate generation' });
  }
}

/**
 * Get certificate statistics
 */
async function getCertificateStats(req, res) {
  try {
    const userId = req.user.id;

    const stats = await Certificate.aggregate([
      { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCertificates = await Certificate.countDocuments({ userId });
    const generatedCertificates = await Certificate.countDocuments({ 
      userId, 
      status: 'generated' 
    });

    return res.json({
      totalCertificates,
      generatedCertificates,
      pendingCertificates: totalCertificates - generatedCertificates,
      stats: stats
    });

  } catch (error) {
    console.error('Certificate stats error:', error);
    return res.status(500).json({ error: 'Error fetching certificate statistics' });
  }
}

/**
 * Get certificate generation progress for an event
 */
async function getCertificateProgress(req, res) {
  try {
    const { eventId } = req.params;
    const requesterId = req.user.id;

    // Check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isHost = event.hostUserId.toString() === requesterId;
    const isCoHost = event.coHosts.includes(requesterId);
    const isAdmin = req.user.roles.includes('platformAdmin');

    if (!isHost && !isCoHost && !isAdmin) {
      return res.status(403).json({ error: 'Only event hosts, co-hosts, or admins can view certificate progress' });
    }

    // Get total attended users
    const totalAttended = await EventParticipationLog.countDocuments({
      eventId,
      status: 'attended'
    });

    // Get certificate statistics
    const certificates = await Certificate.find({ eventId });
    const generated = certificates.filter(c => c.status === 'generated').length;
    const pending = certificates.filter(c => c.status === 'pending').length;
    const failed = certificates.filter(c => c.status === 'failed').length;
    const notGenerated = totalAttended - certificates.length;

    const progress = {
      eventId,
      eventTitle: event.title,
      totalAttended,
      certificatesGenerated: generated,
      certificatesPending: pending,
      certificatesFailed: failed,
      certificatesNotGenerated: notGenerated,
      generationProgress: totalAttended > 0 ? Math.round((certificates.length / totalAttended) * 100) : 0,
      successRate: certificates.length > 0 ? Math.round((generated / certificates.length) * 100) : 0
    };

    return res.json(progress);

  } catch (error) {
    console.error('Certificate progress error:', error);
    return res.status(500).json({ error: 'Error fetching certificate progress' });
  }
}

/**
 * Send certificate notification to user
 */
async function sendCertificateNotification(req, res) {
  try {
    const { certificateId } = req.params;
    const requesterId = req.user.id;

    const certificate = await Certificate.findById(certificateId)
      .populate('userId', 'name email')
      .populate('eventId', 'title');

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Check permissions
    const isHost = certificate.eventId.hostUserId.toString() === requesterId;
    const isCoHost = certificate.eventId.coHosts.includes(requesterId);
    const isAdmin = req.user.roles.includes('platformAdmin');

    if (!isHost && !isCoHost && !isAdmin) {
      return res.status(403).json({ error: 'Only event hosts, co-hosts, or admins can send certificate notifications' });
    }

    if (certificate.status !== 'generated') {
      return res.status(400).json({ error: 'Certificate must be generated before sending notification' });
    }

    await notifyUser({
      userId: certificate.userId._id,
      type: 'certificate',
      message: `Your certificate for ${certificate.eventId.title} is ready!`,
      data: { eventId: certificate.eventId._id, certificateId: certificate._id, certificateURL: certificate.certificateURL },
      emailOptions: {
        to: certificate.userId.email,
        subject: `Your Certificate for ${certificate.eventId.title} is Ready!`,
        html: `<h2>🎉 Your Certificate is Ready!</h2><p>Dear ${certificate.userId.name},</p><p>Your certificate for <strong>${certificate.eventId.title}</strong> has been generated and is now available.</p><p><strong>Certificate Type:</strong> ${certificate.type}</p><p>You can view and download your certificate from your CampVerse dashboard.</p><br><p>Best regards,<br>CampVerse Team</p>`
      }
    });

    return res.json({ 
      message: 'Certificate notification sent successfully',
      recipient: certificate.userId.email
    });

  } catch (error) {
    console.error('Send certificate notification error:', error);
    return res.status(500).json({ error: 'Error sending certificate notification' });
  }
}

/**
 * Get certificate management dashboard for hosts
 */
async function getCertificateDashboard(req, res) {
  try {
    const requesterId = req.user.id;
    const { eventId, status, certificateType, page = 1, limit = 10 } = req.query;

    // Build query for events hosted by the user
    const eventQuery = { hostUserId: requesterId };
    if (eventId) {
      eventQuery._id = eventId;
    }

    const events = await Event.find(eventQuery, '_id title schedule');
    const eventIds = events.map(event => event._id);

    if (eventIds.length === 0) {
      return res.json({
        certificates: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        },
        summary: {
          totalCertificates: 0,
          generated: 0,
          pending: 0,
          failed: 0
        }
      });
    }

    // Build certificate query
    const certificateQuery = { eventId: { $in: eventIds } };
    if (status) {
      certificateQuery.status = status;
    }
    if (certificateType) {
      certificateQuery.type = certificateType;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCertificates = await Certificate.countDocuments(certificateQuery);

    // Get certificates with pagination
    const certificates = await Certificate.find(certificateQuery)
      .populate('userId', 'name email')
      .populate('eventId', 'title schedule')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get summary statistics
    const summary = await Certificate.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const summaryObj = {
      totalCertificates,
      generated: 0,
      pending: 0,
      failed: 0
    };

    summary.forEach(item => {
      summaryObj[item._id] = item.count;
    });

    return res.json({
      certificates: certificates.map(cert => ({
        id: cert._id,
        userId: cert.userId._id,
        userName: cert.userId.name,
        userEmail: cert.userId.email,
        eventId: cert.eventId._id,
        eventTitle: cert.eventId.title,
        eventDate: cert.eventId.schedule?.start,
        certificateType: cert.type,
        status: cert.status,
        certificateURL: cert.certificateURL,
        issuedAt: cert.issuedAt,
        createdAt: cert.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCertificates,
        pages: Math.ceil(totalCertificates / parseInt(limit))
      },
      summary: summaryObj,
      events: events.map(event => ({
        id: event._id,
        title: event.title,
        date: event.schedule?.start
      }))
    });

  } catch (error) {
    console.error('Certificate dashboard error:', error);
    return res.status(500).json({ error: 'Error fetching certificate dashboard' });
  }
}

/**
 * Bulk retry failed certificates for an event
 */
async function bulkRetryFailedCertificates(req, res) {
  try {
    const { eventId } = req.params;
    const requesterId = req.user.id;

    // Check permissions
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const isHost = event.hostUserId.toString() === requesterId;
    const isCoHost = event.coHosts.includes(requesterId);
    const isAdmin = req.user.roles.includes('platformAdmin');

    if (!isHost && !isCoHost && !isAdmin) {
      return res.status(403).json({ error: 'Only event hosts, co-hosts, or admins can retry failed certificates' });
    }

    // Get all failed certificates for the event
    const failedCertificates = await Certificate.find({
      eventId,
      status: 'failed'
    });

    if (failedCertificates.length === 0) {
      return res.status(400).json({ error: 'No failed certificates found for this event' });
    }

    const results = {
      total: failedCertificates.length,
      retried: 0,
      success: 0,
      failed: 0,
      certificates: []
    };

    // Retry each failed certificate
    for (const certificate of failedCertificates) {
      try {
        // Retry ML API call
        const mlResponse = await sendToMLAPI(certificate.certificateData);

        // Update certificate
        certificate.mlApiResponse = {
          requestId: mlResponse.requestId,
          generationStatus: mlResponse.generationStatus,
          errorMessage: mlResponse.errorMessage,
          generatedAt: new Date()
        };

        if (mlResponse.success) {
          certificate.status = 'generated';
          certificate.certificateURL = mlResponse.certificateURL;
          results.success++;
        } else {
          certificate.status = 'failed';
          results.failed++;
        }

        await certificate.save();
        results.retried++;

        results.certificates.push({
          certificateId: certificate._id,
          status: certificate.status,
          success: mlResponse.success,
          errorMessage: mlResponse.errorMessage
        });

      } catch (error) {
        console.error(`Error retrying certificate ${certificate._id}:`, error);
        results.failed++;
        results.certificates.push({
          certificateId: certificate._id,
          status: 'failed',
          success: false,
          errorMessage: error.message
        });
      }
    }

    return res.json({
      message: 'Bulk retry completed',
      eventId,
      eventTitle: event.title,
      results
    });

  } catch (error) {
    console.error('Bulk retry error:', error);
    return res.status(500).json({ error: 'Error retrying failed certificates' });
  }
}

module.exports = {
  generateCertificate,
  getUserCertificates,
  getCertificateById,
  verifyCertificate,
  exportAttendedUsers,
  retryCertificateGeneration,
  getCertificateStats,
  generateBatchCertificates,
  getCertificateProgress,
  sendCertificateNotification,
  getCertificateDashboard,
  bulkRetryFailedCertificates
}; 