const express = require('express');
const {
  updateCertificateSettings,
  uploadCertificateAssets,
  generateCertificates,
  getCertificateStatus,
  getUserCertificate,
  regenerateCertificates,
  bulkUploadParticipants,
} = require('../Controller/certificateManagement');
const { authenticateToken, requireRole } = require('../Middleware/Auth');
const { upload } = require('../Middleware/upload');

const router = express.Router();

/**
 * @swagger
 * /api/certificate-management/events/{eventId}/settings:
 *   patch:
 *     summary: Update certificate settings for an event
 *     tags: [Certificate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               certificateEnabled:
 *                 type: boolean
 *                 description: Enable or disable certificates for this event
 *               certificateType:
 *                 type: string
 *                 enum: [participation, achievement]
 *                 description: Type of certificate
 *               awardText:
 *                 type: string
 *                 description: Text to display on certificate
 *               leftSignatory:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   title:
 *                     type: string
 *               rightSignatory:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   title:
 *                     type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       403:
 *         description: Only host can update settings
 *       404:
 *         description: Event not found
 */
router.patch(
  '/events/:eventId/settings',
  authenticateToken,
  requireRole('host'),
  updateCertificateSettings
);

/**
 * @swagger
 * /api/certificate-management/events/{eventId}/upload-assets:
 *   post:
 *     summary: Upload certificate assets (templates, logos, signatures)
 *     tags: [Certificate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               assetType:
 *                 type: string
 *                 enum: [template, logo, signature, font]
 *                 description: Type of asset being uploaded
 *               template_type:
 *                 type: string
 *                 enum: [participation, achievement]
 *                 description: Required for template uploads
 *               logo_type:
 *                 type: string
 *                 enum: [left, right]
 *                 description: Required for logo uploads
 *               signature_type:
 *                 type: string
 *                 enum: [left, right]
 *                 description: Required for signature uploads
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Assets uploaded successfully
 *       403:
 *         description: Only host can upload assets
 *       404:
 *         description: Event not found
 */
router.post(
  '/events/:eventId/upload-assets',
  authenticateToken,
  requireRole('host'),
  upload.array('files', 10),
  uploadCertificateAssets
);

/**
 * @swagger
 * /api/certificate-management/events/{eventId}/generate:
 *   post:
 *     summary: Generate certificates for all attended participants
 *     tags: [Certificate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Certificates generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 certificates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       certificateUrl:
 *                         type: string
 *                 totalGenerated:
 *                   type: number
 *       400:
 *         description: No attended participants or certificates not enabled
 *       403:
 *         description: Only host can generate certificates
 *       404:
 *         description: Event not found
 */
router.post(
  '/events/:eventId/generate',
  authenticateToken,
  requireRole('host'),
  generateCertificates
);

/**
 * @swagger
 * /api/certificate-management/events/{eventId}/status:
 *   get:
 *     summary: Get certificate generation status for an event
 *     tags: [Certificate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Certificate status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventTitle:
 *                   type: string
 *                 certificateEnabled:
 *                   type: boolean
 *                 totalAttended:
 *                   type: number
 *                 certificatesGenerated:
 *                   type: number
 *                 participants:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Only host/co-host can view status
 *       404:
 *         description: Event not found
 */
router.get(
  '/events/:eventId/status',
  authenticateToken,
  requireRole('host'),
  getCertificateStatus
);

/**
 * @swagger
 * /api/certificate-management/events/{eventId}/my-certificate:
 *   get:
 *     summary: Get user's certificate for a specific event
 *     tags: [Certificate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Certificate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certificate:
 *                   type: object
 *                   properties:
 *                     certificateId:
 *                       type: string
 *                     eventTitle:
 *                       type: string
 *                     eventDate:
 *                       type: string
 *                     certificateUrl:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                     status:
 *                       type: string
 *       404:
 *         description: Certificate not available or not generated yet
 */
router.get(
  '/events/:eventId/my-certificate',
  authenticateToken,
  getUserCertificate
);

/**
 * @swagger
 * /api/certificate-management/events/{eventId}/regenerate:
 *   post:
 *     summary: Regenerate all certificates for an event
 *     tags: [Certificate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Certificates regenerated successfully
 *       403:
 *         description: Only host can regenerate certificates
 *       404:
 *         description: Event not found
 */
router.post(
  '/events/:eventId/regenerate',
  authenticateToken,
  requireRole('host'),
  regenerateCertificates
);

/**
 * @swagger
 * /api/certificate-management/events/{eventId}/bulk-upload:
 *   post:
 *     summary: Bulk upload participant data via CSV
 *     tags: [Certificate Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with participant data
 *     responses:
 *       200:
 *         description: Data uploaded successfully
 *       403:
 *         description: Only host can upload data
 *       404:
 *         description: Event not found
 */
router.post(
  '/events/:eventId/bulk-upload',
  authenticateToken,
  requireRole('host'),
  upload.single('file'),
  bulkUploadParticipants
);

module.exports = router;
