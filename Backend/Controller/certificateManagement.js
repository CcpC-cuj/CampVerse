const Event = require('../Models/Event');
const EventParticipationLog = require('../Models/EventParticipationLog');
const Certificate = require('../Models/Certificate');
const User = require('../Models/User');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

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
 * Files are forwarded to the certificate generator API
 */
async function uploadCertificateAssets(req, res) {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const { assetType } = req.body; // 'template', 'logo', 'signature', 'font'

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

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    const uploadedFiles = [];

    // Forward files to certificate generator API
    for (const file of req.files) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path), file.originalname);

      let endpoint;
      switch (assetType) {
        case 'template':
          endpoint = '/upload-template';
          formData.append('template_type', req.body.template_type || 'participation');
          break;
        case 'logo':
          endpoint = '/upload-logo';
          formData.append('logo_type', req.body.logo_type || 'left');
          break;
        case 'signature':
          endpoint = '/upload-signature';
          formData.append('signature_type', req.body.signature_type || 'left');
          break;
        case 'font':
          endpoint = '/upload-font';
          break;
        default:
          fs.unlinkSync(file.path); // Clean up
          continue;
      }

      try {
        const response = await axios.post(`${CERTIFICATE_API_URL}${endpoint}`, formData, {
          headers: formData.getHeaders(),
        });

        uploadedFiles.push({
          originalName: file.originalname,
          assetType,
          response: response.data,
        });

        // Clean up temp file
        fs.unlinkSync(file.path);
      } catch (apiError) {
        console.error('Error uploading to certificate API:', apiError.message);
        fs.unlinkSync(file.path); // Clean up
        throw new Error(`Failed to upload ${file.originalname}: ${apiError.message}`);
      }
    }

    // Store upload info in event
    if (!event.certificateSettings) {
      event.certificateSettings = {};
    }
    if (!event.certificateSettings.uploadedAssets) {
      event.certificateSettings.uploadedAssets = [];
    }
    event.certificateSettings.uploadedAssets.push(...uploadedFiles);
    await event.save();

    res.json({
      message: 'Assets uploaded successfully.',
      uploadedFiles,
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

    // Configure certificate generator API
    const certificateSettings = event.certificateSettings || {};
    
    // Set certificate type
    if (certificateSettings.certificateType) {
      await axios.post(`${CERTIFICATE_API_URL}/config/certificate-type`, 
        new URLSearchParams({ certificate_type: certificateSettings.certificateType }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    }

    // Set award text
    if (certificateSettings.awardText) {
      await axios.post(`${CERTIFICATE_API_URL}/config/award-text`, {
        text: certificateSettings.awardText,
        position: { x: 810, y: 720 },
        font_size: 45,
        max_width: 1000,
      });
    }

    // Set signatories
    if (certificateSettings.leftSignatory) {
      await axios.post(`${CERTIFICATE_API_URL}/config/signatory-left`, {
        filename: 'signature_left.png',
        name: certificateSettings.leftSignatory.name,
        title: certificateSettings.leftSignatory.title,
        image_position: { x: 400, y: 1100 },
        text_position: { x: 400, y: 1200 },
        font_size: 35,
        color: 'black',
      });
    }

    if (certificateSettings.rightSignatory) {
      await axios.post(`${CERTIFICATE_API_URL}/config/signatory-right`, {
        filename: 'signature_right.png',
        name: certificateSettings.rightSignatory.name,
        title: certificateSettings.rightSignatory.title,
        image_position: { x: 1200, y: 1100 },
        text_position: { x: 1200, y: 1200 },
        font_size: 35,
        color: 'black',
      });
    }

    // Generate certificates
    const participantNames = attendedLogs.map((log) => log.userId.name);
    
    const generateResponse = await axios.post(`${CERTIFICATE_API_URL}/generate`, {
      names: participantNames,
    });

    const generatedFiles = generateResponse.data.files || [];

    // Create certificate records in database
    const certificateRecords = [];
    for (let i = 0; i < attendedLogs.length; i++) {
      const log = attendedLogs[i];
      const filename = generatedFiles[i];

      const certificate = await Certificate.create({
        userId: log.userId._id,
        eventId: eventId,
        certificateUrl: `${CERTIFICATE_API_URL}/download/${filename}`,
        generatedAt: new Date(),
        status: 'generated',
      });

      certificateRecords.push({
        userId: log.userId._id,
        userName: log.userId.name,
        email: log.userId.email,
        certificateUrl: certificate.certificateUrl,
      });
    }

    res.json({
      message: `Successfully generated ${certificateRecords.length} certificate(s).`,
      certificates: certificateRecords,
      totalGenerated: certificateRecords.length,
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

module.exports = {
  updateCertificateSettings,
  uploadCertificateAssets,
  generateCertificates,
  getCertificateStatus,
  getUserCertificate,
  regenerateCertificates,
  bulkUploadParticipants,
};
