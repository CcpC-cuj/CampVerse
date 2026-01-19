const Event = require('../Models/Event');
const User = require('../Models/User');
const { notifyUser } = require('../Services/notification');
const { logger } = require('../Middleware/errorHandler');
const { cacheService } = require('../Services/cacheService');

/**
 * Get all pending certificate verifications
 */
async function getPendingVerifications(req, res) {
  try {
    const { page = 1, limit = 10, eventType } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      'certificateSettings.verificationStatus': 'pending',
      'features.certificateEnabled': true,
    };

    if (eventType) {
      query.type = eventType;
    }

    // Get pending events
    const events = await Event.find(query)
      .populate('hostUserId', 'name email')
      .populate('institutionId', 'name')
      .populate('certificateSettings.submittedBy', 'name email')
      .sort({ 'certificateSettings.submittedAt': 1 }) // Oldest first
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const totalPending = await Event.countDocuments(query);

    // Format response
    const pending = events.map((event) => ({
      eventId: event._id,
      eventTitle: event.title,
      eventDate: event.date,
      eventType: event.type,
      hostName: event.hostUserId?.name,
      hostEmail: event.hostUserId?.email,
      institutionName: event.institutionId?.name,
      certificateConfig: {
        selectedTemplateId: event.certificateSettings.selectedTemplateId,
        certificateType: event.certificateSettings.certificateType,
        awardText: event.certificateSettings.awardText,
        leftSignatory: event.certificateSettings.leftSignatory,
        rightSignatory: event.certificateSettings.rightSignatory,
        uploadedAssets: event.certificateSettings.uploadedAssets,
      },
      submittedAt: event.certificateSettings.submittedAt,
      submittedBy: event.certificateSettings.submittedBy,
    }));

    return res.json({
      pending,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalPending,
        pages: Math.ceil(totalPending / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get pending verifications error:', error);
    return res
      .status(500)
      .json({ error: 'Error fetching pending verifications' });
  }
}

/**
 * Get verification statistics
 */
async function getVerificationStats(req, res) {
  try {
    const stats = await Event.aggregate([
      {
        $match: {
          'features.certificateEnabled': true,
        },
      },
      {
        $group: {
          _id: '$certificateSettings.verificationStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsObj = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      not_configured: 0,
    };

    stats.forEach((stat) => {
      statsObj[stat._id || 'not_configured'] = stat.count;
      statsObj.total += stat.count;
    });

    return res.json(statsObj);
  } catch (error) {
    logger.error('Get verification stats error:', error);
    return res
      .status(500)
      .json({ error: 'Error fetching verification statistics' });
  }
}

/**
 * Get specific verification details
 */
async function getVerificationById(req, res) {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('hostUserId', 'name email')
      .populate('institutionId', 'name')
      .populate('certificateSettings.submittedBy', 'name email')
      .populate('certificateSettings.verifiedBy', 'name email')
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.features.certificateEnabled) {
      return res
        .status(400)
        .json({ error: 'Certificates not enabled for this event' });
    }

    return res.json({
      eventId: event._id,
      eventTitle: event.title,
      eventDescription: event.description,
      eventDate: event.date,
      eventType: event.type,
      hostName: event.hostUserId?.name,
      hostEmail: event.hostUserId?.email,
      institutionName: event.institutionId?.name,
      certificateConfig: {
        selectedTemplateId: event.certificateSettings.selectedTemplateId,
        certificateType: event.certificateSettings.certificateType,
        awardText: event.certificateSettings.awardText,
        leftSignatory: event.certificateSettings.leftSignatory,
        rightSignatory: event.certificateSettings.rightSignatory,
        uploadedAssets: event.certificateSettings.uploadedAssets,
      },
      verificationStatus: event.certificateSettings.verificationStatus,
      submittedAt: event.certificateSettings.submittedAt,
      submittedBy: event.certificateSettings.submittedBy,
      verifiedAt: event.certificateSettings.verifiedAt,
      verifiedBy: event.certificateSettings.verifiedBy,
      rejectionReason: event.certificateSettings.rejectionReason,
    });
  } catch (error) {
    logger.error('Get verification by ID error:', error);
    return res
      .status(500)
      .json({ error: 'Error fetching verification details' });
  }
}

/**
 * Approve certificate configuration
 */
async function approveCertificateConfig(req, res) {
  try {
    const { eventId } = req.params;
    const verifierId = req.user.id;

    const event = await Event.findById(eventId).populate(
      'hostUserId',
      'name email'
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.features.certificateEnabled) {
      return res
        .status(400)
        .json({ error: 'Certificates not enabled for this event' });
    }

    if (event.certificateSettings.verificationStatus !== 'pending') {
      return res.status(400).json({
        error: `Certificate configuration is not pending (current status: ${event.certificateSettings.verificationStatus})`,
      });
    }

    // Check if all required assets are uploaded
    const assets = event.certificateSettings.uploadedAssets;
    if (
      !assets?.organizationLogo ||
      !assets?.leftSignature ||
      !assets?.rightSignature
    ) {
      return res.status(400).json({
        error:
          'Cannot approve: Missing required assets (organization logo, left signature, or right signature)',
      });
    }

    // Update verification status and potentially the template
    const { selectedTemplateId } = req.body;
    if (selectedTemplateId) {
      event.certificateSettings.selectedTemplateId = selectedTemplateId;
    }
    
    event.certificateSettings.verificationStatus = 'approved';
    event.certificateSettings.verifiedBy = verifierId;
    event.certificateSettings.verifiedAt = new Date();

    await event.save();

    // Invalidate cache so verifier dashboard shows updated data
    await cacheService.invalidateCertificateVerification(eventId);
    await cacheService.invalidateVerifierCache();

    // Notify host
    const host = event.hostUserId;
    if (host) {
      await notifyUser({
        userId: host._id,
        type: 'certificate_verification',
        message: `Your certificate configuration for "${event.title}" has been approved!`,
        data: {
          eventId: event._id,
          eventTitle: event.title,
          status: 'approved',
        },
        emailOptions: {
          to: host.email,
          subject: `Certificate Configuration Approved: ${event.title}`,
          html: `
            <h2>🎉 Certificate Configuration Approved!</h2>
            <p>Dear ${host.name},</p>
            <p>Your certificate configuration for <strong>${event.title}</strong> has been <strong>approved</strong> by a verifier.</p>
            <p>You can now generate certificates for all attended participants.</p>
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Go to your Host Dashboard</li>
              <li>Navigate to Certificate Management</li>
              <li>Click "Generate Certificates" to create certificates for all attended participants</li>
            </ul>
            <br>
            <p>Best regards,<br>CampVerse Team</p>
          `,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Certificate configuration approved successfully',
      eventId: event._id,
      verificationStatus: 'approved',
      approvedBy: verifierId,
      approvedAt: event.certificateSettings.verifiedAt,
    });
  } catch (error) {
    logger.error('Approve certificate config error:', error);
    return res
      .status(500)
      .json({ error: 'Error approving certificate configuration' });
  }
}

/**
 * Reject certificate configuration
 */
async function rejectCertificateConfig(req, res) {
  try {
    const { eventId } = req.params;
    const { reason, specificIssues } = req.body;
    const verifierId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const event = await Event.findById(eventId).populate(
      'hostUserId',
      'name email'
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.features.certificateEnabled) {
      return res
        .status(400)
        .json({ error: 'Certificates not enabled for this event' });
    }

    if (event.certificateSettings.verificationStatus !== 'pending') {
      return res.status(400).json({
        error: `Certificate configuration is not pending (current status: ${event.certificateSettings.verificationStatus})`,
      });
    }

    // Update verification status
    event.certificateSettings.verificationStatus = 'rejected';
    event.certificateSettings.verifiedBy = verifierId;
    event.certificateSettings.verifiedAt = new Date();
    event.certificateSettings.rejectionReason = reason;
    
    if (specificIssues && Array.isArray(specificIssues)) {
      event.certificateSettings.specificIssues = specificIssues;
    }

    await event.save();

    // Invalidate cache so verifier dashboard shows updated data
    await cacheService.invalidateCertificateVerification(eventId);
    await cacheService.invalidateVerifierCache();

    // Notify host with detailed feedback
    const host = event.hostUserId;
    if (host) {
      const issuesList = specificIssues && specificIssues.length > 0
        ? `<ul>${specificIssues.map(issue => `<li>${issue}</li>`).join('')}</ul>`
        : '';

      await notifyUser({
        userId: host._id,
        type: 'certificate_verification',
        message: `Your certificate configuration for "${event.title}" was rejected. Please review and resubmit.`,
        data: {
          eventId: event._id,
          eventTitle: event.title,
          status: 'rejected',
          reason: reason,
          specificIssues: specificIssues,
        },
        emailOptions: {
          to: host.email,
          subject: `Certificate Configuration Rejected: ${event.title}`,
          html: `
            <h2>⚠️ Certificate Configuration Rejected</h2>
            <p>Dear ${host.name},</p>
            <p>Your certificate configuration for <strong>${event.title}</strong> has been <strong>rejected</strong> by a verifier.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            ${issuesList ? `<p><strong>Specific Issues:</strong></p>${issuesList}` : ''}
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the feedback above</li>
              <li>Make the necessary corrections</li>
              <li>Re-upload assets if needed</li>
              <li>Update settings as required</li>
              <li>Resubmit for verification</li>
            </ul>
            <br>
            <p>If you have questions, please contact support.</p>
            <br>
            <p>Best regards,<br>CampVerse Team</p>
          `,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Certificate configuration rejected',
      eventId: event._id,
      verificationStatus: 'rejected',
      rejectedBy: verifierId,
      rejectedAt: event.certificateSettings.verifiedAt,
      rejectionReason: reason,
      specificIssues: specificIssues,
    });
  } catch (error) {
    logger.error('Reject certificate config error:', error);
    return res
      .status(500)
      .json({ error: 'Error rejecting certificate configuration' });
  }
}

/**
 * Request changes to certificate configuration
 */
async function requestConfigChanges(req, res) {
  try {
    const { eventId } = req.params;
    const { requestedChanges } = req.body;
    const verifierId = req.user.id;

    if (!requestedChanges || !Array.isArray(requestedChanges) || requestedChanges.length === 0) {
      return res.status(400).json({ error: 'Requested changes are required' });
    }

    const event = await Event.findById(eventId).populate(
      'hostUserId',
      'name email'
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.features.certificateEnabled) {
      return res
        .status(400)
        .json({ error: 'Certificates not enabled for this event' });
    }

    if (event.certificateSettings.verificationStatus !== 'pending') {
      return res.status(400).json({
        error: `Certificate configuration is not pending (current status: ${event.certificateSettings.verificationStatus})`,
      });
    }

    // Store requested changes (status remains pending)
    event.certificateSettings.requestedChanges = requestedChanges;
    event.certificateSettings.changesRequestedBy = verifierId;
    event.certificateSettings.changesRequestedAt = new Date();

    await event.save();

    // Notify host with requested changes
    const host = event.hostUserId;
    if (host) {
      const changesList = `<ul>${requestedChanges.map(change => `<li>${change}</li>`).join('')}</ul>`;

      await notifyUser({
        userId: host._id,
        type: 'certificate_verification',
        message: `Changes requested for your certificate configuration for "${event.title}"`,
        data: {
          eventId: event._id,
          eventTitle: event.title,
          status: 'pending',
          requestedChanges: requestedChanges,
        },
        emailOptions: {
          to: host.email,
          subject: `Changes Requested: Certificate Configuration for ${event.title}`,
          html: `
            <h2>📝 Changes Requested</h2>
            <p>Dear ${host.name},</p>
            <p>A verifier has reviewed your certificate configuration for <strong>${event.title}</strong> and is requesting the following changes:</p>
            ${changesList}
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the requested changes above</li>
              <li>Make the necessary updates</li>
              <li>Your configuration will remain in the verification queue</li>
              <li>No need to resubmit - it will be automatically reviewed again</li>
            </ul>
            <br>
            <p>Best regards,<br>CampVerse Team</p>
          `,
        },
      });
    }

    return res.json({
      success: true,
      message: 'Changes requested successfully',
      eventId: event._id,
      verificationStatus: 'pending',
      requestedChanges: requestedChanges,
      requestedBy: verifierId,
      requestedAt: event.certificateSettings.changesRequestedAt,
    });
  } catch (error) {
    logger.error('Request config changes error:', error);
    return res
      .status(500)
      .json({ error: 'Error requesting configuration changes' });
  }
}

module.exports = {
  getPendingVerifications,
  getVerificationStats,
  getVerificationById,
  approveCertificateConfig,
  rejectCertificateConfig,
  requestConfigChanges,
};
