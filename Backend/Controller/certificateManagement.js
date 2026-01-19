const Event = require('../Models/Event');
const EventParticipationLog = require('../Models/EventParticipationLog');
const Certificate = require('../Models/Certificate');
const User = require('../Models/User');
const axios = require('axios');
const { storageService } = require('../Services/storageService');

// Certificate Generator API URL (update based on your deployment)
const CERTIFICATE_API_URL = process.env.CERTIFICATE_API_URL || 'http://localhost:8000';

/**
 * Update event certificate settings
 * Host can enable/disable certificates and configure settings
 */
async function updateCertificateSettings(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const {
      certificateEnabled,
      certificateType,
      awardText,
      leftSignatory,
      rightSignatory,
    } = req.body;

    // Find event and verify host permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === userId;
    if (!isHost) {
      return res.status(403).json({
        error: 'Only the event host can update certificate settings.',
      });
    }

    // Update certificate settings
    if (certificateEnabled !== undefined) {
      event.features = event.features || {};
      event.features.certificateEnabled = certificateEnabled;
    }

    if (!event.certificateSettings) {
      event.certificateSettings = {};
    }

    if (certificateType) {
      event.certificateSettings.certificateType = certificateType;
    }
    if (awardText) {
      event.certificateSettings.awardText = awardText;
    }
    if (leftSignatory) {
      event.certificateSettings.leftSignatory = leftSignatory;
    }
    if (rightSignatory) {
      event.certificateSettings.rightSignatory = rightSignatory;
    }

    await event.save();

    res.json({
      message: 'Certificate settings updated successfully.',
      certificateEnabled: event.features.certificateEnabled,
      certificateSettings: event.certificateSettings,
    });
  } catch (err) {
    console.error('Error updating certificate settings:', err);
    res.status(500).json({ error: 'Server error updating certificate settings.' });
  }
}

/**
 * Upload certificate assets (template, logos, signatures)
 * Files are uploaded to cloud storage
 */
async function uploadCertificateAssets(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { assetType } = req.body; // 'template', 'orgLogo', 'leftSignature', 'rightSignature'

    // Verify event and host permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === userId;
    if (!isHost) {
      return res.status(403).json({
        error: 'Only the event host can upload certificate assets.',
      });
    }

    // Check if certificates are enabled
    if (!event.features?.certificateEnabled) {
      return res.status(400).json({
        error: 'Certificates are not enabled for this event.',
      });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const uploadedFiles = [];

    // Initialize certificate assets structure
    if (!event.certificateSettings) {
      event.certificateSettings = {};
    }
    if (!event.certificateSettings.assets) {
      event.certificateSettings.assets = {};
    }

    // Upload files to cloud storage
    for (const file of req.files) {
      try {
        let uploadResult;
        
        switch (assetType) {
          case 'template':
            const templateType = req.body.template_type || 'participation';
            uploadResult = await storageService.uploadCertificateTemplate(
              file.buffer,
              file.originalname,
              eventId,
              templateType,
              file.mimetype
            );
            
            // Store template info
            event.certificateSettings.assets.templateUrl = uploadResult.url;
            event.certificateSettings.assets.templatePath = uploadResult.path;
            event.certificateSettings.certificateType = templateType;
            break;

          case 'orgLogo':
            uploadResult = await storageService.uploadCertificateLogo(
              file.buffer,
              file.originalname,
              eventId,
              'organization',
              file.mimetype
            );
            
            // Store org logo info
            event.certificateSettings.assets.orgLogoUrl = uploadResult.url;
            event.certificateSettings.assets.orgLogoPath = uploadResult.path;
            break;

          case 'leftSignature':
            uploadResult = await storageService.uploadCertificateSignature(
              file.buffer,
              file.originalname,
              eventId,
              'left',
              file.mimetype
            );
            
            // Store left signature info
            if (!event.certificateSettings.leftSignatory) {
              event.certificateSettings.leftSignatory = {};
            }
            event.certificateSettings.leftSignatory.signatureUrl = uploadResult.url;
            event.certificateSettings.leftSignatory.signaturePath = uploadResult.path;
            if (req.body.leftSignatoryName) {
              event.certificateSettings.leftSignatory.name = req.body.leftSignatoryName;
            }
            if (req.body.leftSignatoryTitle) {
              event.certificateSettings.leftSignatory.title = req.body.leftSignatoryTitle;
            }
            break;

          case 'rightSignature':
            uploadResult = await storageService.uploadCertificateSignature(
              file.buffer,
              file.originalname,
              eventId,
              'right',
              file.mimetype
            );
            
            // Store right signature info
            if (!event.certificateSettings.rightSignatory) {
              event.certificateSettings.rightSignatory = {};
            }
            event.certificateSettings.rightSignatory.signatureUrl = uploadResult.url;
            event.certificateSettings.rightSignatory.signaturePath = uploadResult.path;
            if (req.body.rightSignatoryName) {
              event.certificateSettings.rightSignatory.name = req.body.rightSignatoryName;
            }
            if (req.body.rightSignatoryTitle) {
              event.certificateSettings.rightSignatory.title = req.body.rightSignatoryTitle;
            }
            break;

          default:
            continue;
        }

        uploadedFiles.push({
          originalName: file.originalname,
          assetType,
          url: uploadResult.url,
          path: uploadResult.path,
        });

      } catch (uploadError) {
        console.error('Error uploading asset:', uploadError.message);
        throw new Error(`Failed to upload ${file.originalname}: ${uploadError.message}`);
      }
    }

    // Save event with updated assets
    await event.save();

    res.json({
      message: 'Assets uploaded successfully to cloud storage.',
      uploadedFiles,
      certificateSettings: event.certificateSettings,
    });
  } catch (err) {
    console.error('Error uploading certificate assets:', err);
    res.status(500).json({ error: err.message || 'Server error uploading assets.' });
  }
}

/**
 * Generate certificates for all attended participants
 * This is triggered by the host after the event
 */
async function generateCertificates(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event and host permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === userId;
    if (!isHost) {
      return res.status(403).json({
        error: 'Only the event host can generate certificates.',
      });
    }

    // Check if certificates are enabled
    if (!event.features?.certificateEnabled) {
      return res.status(400).json({
        error: 'Certificates are not enabled for this event.',
      });
    }

    // Check if certificate setup is approved
    if (event.certificateSettings?.verificationStatus !== 'approved') {
      return res.status(400).json({
        error: 'Certificate setup must be approved by a verifier before generation.',
        currentStatus: event.certificateSettings?.verificationStatus || 'not_configured',
      });
    }


    // Check if required assets are uploaded - using uploadedAssets structure
    const uploadedAssets = event.certificateSettings?.uploadedAssets || {};
    const settings = event.certificateSettings || {};
    
    // Template can come from upload OR predefined selection
    const PREDEFINED_TEMPLATES = {
      'classic-blue': 'https://storage.campverse.com/templates/classic-blue.png',
      'modern-purple': 'https://storage.campverse.com/templates/modern-purple.png',
      'elegant-gold': 'https://storage.campverse.com/templates/elegant-gold.png',
      'minimal-dark': 'https://storage.campverse.com/templates/minimal-dark.png',
    };
    const templateUrl = uploadedAssets.templateUrl || PREDEFINED_TEMPLATES[settings.selectedTemplateId];
    
    if (!templateUrl || !uploadedAssets.organizationLogo || 
        !uploadedAssets.leftSignature || !uploadedAssets.rightSignature) {
      return res.status(400).json({
        error: 'All required assets must be uploaded (template/selection, organization logo, and both signatures).',
        uploaded: {
          template: !!templateUrl,
          orgLogo: !!uploadedAssets.organizationLogo,
          leftSignature: !!uploadedAssets.leftSignature,
          rightSignature: !!uploadedAssets.rightSignature,
        },
      });
    }

    // Get all attended participants
    const attendedLogs = await EventParticipationLog.find({
      eventId,
      status: 'attended',
    }).populate('userId', 'name email');

    if (attendedLogs.length === 0) {
      return res.status(400).json({
        error: 'No attended participants found for this event.',
      });
    }

    // Prepare batch generation request - use the corrected variables
    const certificateSettings = event.certificateSettings;
    
    const batchRequest = {
      eventId: eventId,
      eventTitle: event.title,
      templateUrl: templateUrl, // Already resolved above with fallback
      orgLogoUrl: uploadedAssets.organizationLogo,
      leftSignature: {
        url: uploadedAssets.leftSignature,
        name: certificateSettings.leftSignatory?.name || '',
        title: certificateSettings.leftSignatory?.title || '',
      },
      rightSignature: {
        url: uploadedAssets.rightSignature,
        name: certificateSettings.rightSignatory?.name || '',
        title: certificateSettings.rightSignatory?.title || '',
      },
      awardText: certificateSettings.awardText || 'For successfully participating in',
      certificateType: certificateSettings.certificateType || 'participation',
      participants: attendedLogs.map((log) => ({
        userId: log.userId._id.toString(),
        name: log.userId.name,
        email: log.userId.email,
      })),
    };

    // Call ML batch generation endpoint - NOT storing PDFs, just validating generation
    // Certificates will be rendered on-demand when requested
    let generateResponse;
    try {
      // Send a test generation request to validate assets
      generateResponse = await axios.post(
        `${CERTIFICATE_API_URL}/batch-validate`, 
        batchRequest,
        { timeout: 30000 } // 30 second timeout just for validation
      );
    } catch (apiError) {
      console.error('Error validating certificate generation:', apiError.message);
      return res.status(500).json({
        error: 'Failed to validate certificate generation from ML service.',
        details: apiError.message,
      });
    }

    // Create certificate records with metadata only (NO URLs stored)
    // Certificates will be generated on-demand when users request them
    const certificateRecords = [];
    for (const log of attendedLogs) {
      // Check if certificate record already exists
      let certificate = await Certificate.findOne({
        userId: log.userId._id,
        eventId: eventId,
      });

      if (!certificate) {
        certificate = await Certificate.create({
          userId: log.userId._id,
          eventId: eventId,
          type: certificateSettings.certificateType === 'achievement' ? 'winner' : 'participant', // REQUIRED field
          status: 'ready', // Status indicates certificate is ready to be rendered
          issuedAt: new Date(),
          // NO certificateUrl - certificates are rendered on-demand
        });
      } else {
        // Update existing certificate
        certificate.status = 'ready';
        certificate.updatedAt = new Date();
        await certificate.save();
      }

      certificateRecords.push({
        userId: log.userId._id,
        userName: log.userId.name,
        email: log.userId.email,
        status: 'ready',
        renderUrl: `/api/certificate-management/events/${eventId}/render/${log.userId._id}`, // Correct path
      });
    }

    // Update event with generation timestamp
    event.certificateSettings.lastGeneratedAt = new Date();
    event.certificateSettings.certificatesReady = true;
    await event.save();

    res.json({
      message: `Successfully prepared ${certificateRecords.length} certificate(s) for on-demand rendering.`,
      note: 'Certificates are not stored. They will be generated when users download them.',
      certificates: certificateRecords,
      totalGenerated: certificateRecords.length,
      totalParticipants: attendedLogs.length,
    });
  } catch (err) {
    console.error('Error generating certificates:', err);
    res.status(500).json({
      error: 'Server error generating certificates.',
      details: err.message,
    });
  }
}

/**
 * Get certificate status for an event
 * Returns list of participants and their certificate status
 */
async function getCertificateStatus(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event and host permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === userId;
    const isCoHost = event.coHosts?.some((id) => id.toString() === userId);

    if (!isHost && !isCoHost) {
      return res.status(403).json({
        error: 'Only host or co-host can view certificate status.',
      });
    }

    // Get all attended participants
    const attendedLogs = await EventParticipationLog.find({
      eventId,
      status: 'attended',
    }).populate('userId', 'name email');

    // Get certificate records
    const certificates = await Certificate.find({ eventId });
    const certificateMap = {};
    certificates.forEach((cert) => {
      certificateMap[cert.userId.toString()] = cert;
    });

    // Build status list
    const statusList = attendedLogs.map((log) => {
      const cert = certificateMap[log.userId._id.toString()];
      return {
        userId: log.userId._id,
        name: log.userId.name,
        email: log.userId.email,
        attendedAt: log.attendanceTimestamp,
        certificateGenerated: !!cert,
        certificateUrl: cert?.certificateUrl,
        certificateStatus: cert?.status,
        generatedAt: cert?.generatedAt,
      };
    });

    res.json({
      eventTitle: event.title,
      certificateEnabled: event.features?.certificateEnabled || false,
      totalAttended: attendedLogs.length,
      certificatesGenerated: certificates.length,
      participants: statusList,
    });
  } catch (err) {
    console.error('Error fetching certificate status:', err);
    res.status(500).json({ error: 'Server error fetching certificate status.' });
  }
}

/**
 * Get user's certificate for a specific event
 */
async function getUserCertificate(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check if user attended the event
    const log = await EventParticipationLog.findOne({
      eventId,
      userId,
      status: 'attended',
    });

    if (!log) {
      return res.status(404).json({
        error: 'Certificate not available.',
        message: 'You must attend the event to receive a certificate.',
      });
    }

    // Find certificate
    const certificate = await Certificate.findOne({
      eventId,
      userId,
    }).populate('eventId', 'title date');

    if (!certificate) {
      return res.status(404).json({
        error: 'Certificate not generated yet.',
        message: 'The event host has not generated certificates yet.',
      });
    }

    res.json({
      certificate: {
        certificateId: certificate._id,
        eventTitle: certificate.eventId.title,
        eventDate: certificate.eventId.date,
        certificateUrl: certificate.certificateUrl,
        generatedAt: certificate.generatedAt,
        status: certificate.status,
      },
    });
  } catch (err) {
    console.error('Error fetching user certificate:', err);
    res.status(500).json({ error: 'Server error fetching certificate.' });
  }
}

/**
 * Regenerate certificates (if needed)
 */
async function regenerateCertificates(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event and host permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === userId;
    if (!isHost) {
      return res.status(403).json({
        error: 'Only the event host can regenerate certificates.',
      });
    }

    // Delete existing certificates
    await Certificate.deleteMany({ eventId });

    // Regenerate
    return generateCertificates(req, res);
  } catch (err) {
    console.error('Error regenerating certificates:', err);
    res.status(500).json({ error: 'Server error regenerating certificates.' });
  }
}

/**
 * Bulk upload participant data via CSV for certificate generation
 */
async function bulkUploadParticipants(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify event and host permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === userId;
    if (!isHost) {
      return res.status(403).json({
        error: 'Only the event host can upload participant data.',
      });
    }

    // This endpoint expects a CSV file with participant data
    // The CSV should be parsed and used to update/verify participant records
    // Implementation depends on your CSV parsing library

    res.json({
      message: 'Bulk upload functionality - to be implemented with CSV parser.',
    });
  } catch (err) {
    console.error('Error in bulk upload:', err);
    res.status(500).json({ error: 'Server error in bulk upload.' });
  }
}

/**
 * Render certificate on-demand for a specific user
 * Generates the certificate in real-time and streams it to the response
 */
async function renderCertificate(req, res) {
  try {
    const { eventId, userId } = req.params;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own certificate or is the host
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === requestingUserId;
    const isOwnCertificate = userId === requestingUserId;

    if (!isHost && !isOwnCertificate) {
      return res.status(403).json({
        error: 'You can only access your own certificate or certificates from events you host.',
      });
    }

    // Check if certificate is ready
    const certificate = await Certificate.findOne({
      eventId,
      userId,
      status: 'ready',
    });

    if (!certificate) {
      return res.status(404).json({
        error: 'Certificate not available.',
        message: 'Certificate has not been generated yet or you did not attend this event.',
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Get certificate settings
    const certificateSettings = event.certificateSettings;
    if (!certificateSettings?.assets) {
      return res.status(500).json({
        error: 'Certificate configuration not found.',
      });
    }

    // Prepare single certificate generation request
    const renderRequest = {
      eventId: eventId,
      eventTitle: event.title,
      templateUrl: certificateSettings.assets.templateUrl,
      orgLogoUrl: certificateSettings.assets.orgLogoUrl,
      leftSignature: {
        url: certificateSettings.leftSignatory.signatureUrl,
        name: certificateSettings.leftSignatory.name,
        title: certificateSettings.leftSignatory.title,
      },
      rightSignature: {
        url: certificateSettings.rightSignatory.signatureUrl,
        name: certificateSettings.rightSignatory.name,
        title: certificateSettings.rightSignatory.title,
      },
      awardText: certificateSettings.awardText || 'For successfully participating in',
      certificateType: certificateSettings.certificateType || 'participation',
      participant: {
        userId: userId,
        name: user.name,
        email: user.email,
      },
    };

    // Call ML single certificate render endpoint
    try {
      const renderResponse = await axios.post(
        `${CERTIFICATE_API_URL}/render-certificate`,
        renderRequest,
        {
          responseType: 'arraybuffer', // Get PDF as binary data
          timeout: 30000, // 30 second timeout
        }
      );

      // Stream the PDF directly to the response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${user.name.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.pdf"`
      );
      res.send(renderResponse.data);
    } catch (apiError) {
      console.error('Error rendering certificate:', apiError.message);
      return res.status(500).json({
        error: 'Failed to render certificate.',
        details: apiError.message,
      });
    }
  } catch (err) {
    console.error('Error in renderCertificate:', err);
    res.status(500).json({
      error: 'Server error rendering certificate.',
      details: err.message,
    });
  }
}

/**
 * Submit certificate configuration for verification
 */
async function submitCertificateConfig(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Find event and verify host permission
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const isHost = event.hostUserId.toString() === userId;
    if (!isHost) {
      return res.status(403).json({
        error: 'Only the event host can submit certificate configuration.',
      });
    }

    // Check if certificates are enabled
    if (!event.features?.certificateEnabled) {
      return res.status(400).json({
        error: 'Certificates are not enabled for this event.',
      });
    }

    // Validate if basic settings exist
    const settings = event.certificateSettings;
    if (!settings?.awardText || !settings?.leftSignatory?.name || !settings?.rightSignatory?.name) {
      return res.status(400).json({
        error: 'Please configure Award Text and both Signatories before submitting.',
      });
    }

    // Update status
    event.certificateSettings.verificationStatus = 'pending';
    event.certificateSettings.submittedBy = userId;
    event.certificateSettings.submittedAt = new Date();

    await event.save();

    res.json({
      message: 'Certificate configuration submitted for verification.',
      verificationStatus: 'pending',
    });
  } catch (err) {
    console.error('Error submitting certificate configuration:', err);
    res.status(500).json({ error: 'Server error submitting configuration.' });
  }
}

module.exports = {
  updateCertificateSettings,
  uploadCertificateAssets,
  generateCertificates,
  getCertificateStatus,
  getUserCertificate,
  regenerateCertificates,
  bulkUploadParticipants,
  renderCertificate,
  submitCertificateConfig,
};
