const express = require('express');
const {
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
} = require('../Controller/certificate');
const { authenticateToken, requireRole, requireSelfOrRole } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Certificate:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         eventId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [participant, winner, organizer, co-organizer]
 *         status:
 *           type: string
 *           enum: [pending, generated, failed]
 *         certificateURL:
 *           type: string
 *         issuedAt:
 *           type: string
 *           format: date-time
 *     CertificateGenerationRequest:
 *       type: object
 *       required:
 *         - userId
 *         - eventId
 *       properties:
 *         userId:
 *           type: string
 *         eventId:
 *           type: string
 *         certificateType:
 *           type: string
 *           enum: [participant, winner, organizer, co-organizer]
 *           default: participant
 */

/**
 * @swagger
 * tags:
 *   name: Certificate
 *   description: Certificate generation and management APIs
 */

/**
 * @swagger
 * /api/certificates/generate:
 *   post:
 *     summary: Generate certificate for attended user
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateGenerationRequest'
 *     responses:
 *       201:
 *         description: Certificate generation initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 certificate:
 *                   $ref: '#/components/schemas/Certificate'
 *       400:
 *         description: Bad request - User must have attended the event
 *       403:
 *         description: Forbidden - Only hosts, co-hosts, or admins can generate certificates
 *       404:
 *         description: Event not found
 */
router.post('/generate', authenticateToken, generateCertificate);

/**
 * @swagger
 * /api/certificates/my:
 *   get:
 *     summary: Get user's certificates
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User certificates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certificates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certificate'
 *       500:
 *         description: Server error
 */
router.get('/my', authenticateToken, getUserCertificates);

/**
 * @swagger
 * /api/certificates/user/{userId}:
 *   get:
 *     summary: Get certificates for specific user (admin/host only)
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User certificates retrieved successfully
 *       403:
 *         description: Forbidden - Access denied
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserCertificates);

/**
 * @swagger
 * /api/certificates/stats:
 *   get:
 *     summary: Get certificate statistics for user
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Certificate statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCertificates:
 *                   type: number
 *                 generatedCertificates:
 *                   type: number
 *                 pendingCertificates:
 *                   type: number
 *                 stats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       count:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get('/stats', authenticateToken, getCertificateStats);

/**
 * @swagger
 * /api/certificates/{id}:
 *   get:
 *     summary: Get certificate by ID
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certificate:
 *                   $ref: '#/components/schemas/Certificate'
 *       404:
 *         description: Certificate not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticateToken, getCertificateById);

/**
 * @swagger
 * /api/certificates/verify:
 *   post:
 *     summary: Verify certificate using QR code
 *     tags: [Certificate]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCode
 *             properties:
 *               qrCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Certificate verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 certificate:
 *                   type: object
 *                   properties:
 *                     userName:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *                     eventTitle:
 *                       type: string
 *                     eventDate:
 *                       type: string
 *                       format: date-time
 *                     certificateType:
 *                       type: string
 *                     issuedAt:
 *                       type: string
 *                       format: date-time
 *                     certificateURL:
 *                       type: string
 *       400:
 *         description: Invalid QR code or certificate not generated
 *       404:
 *         description: Certificate not found
 *       500:
 *         description: Server error
 */
router.post('/verify', verifyCertificate);

/**
 * @swagger
 * /api/certificates/export-attended/{eventId}:
 *   get:
 *     summary: Export attended users for ML certificate generation
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attended users exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: string
 *                     eventTitle:
 *                       type: string
 *                     totalAttended:
 *                       type: number
 *                     attendedUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           userEmail:
 *                             type: string
 *                           userSkills:
 *                             type: array
 *                             items:
 *                               type: string
 *                           attendanceDate:
 *                             type: string
 *                             format: date-time
 *                 count:
 *                   type: number
 *       403:
 *         description: Forbidden - Only hosts, co-hosts, or admins can export
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/export-attended/:eventId', authenticateToken, exportAttendedUsers);

/**
 * @swagger
 * /api/certificates/{certificateId}/retry:
 *   post:
 *     summary: Retry failed certificate generation
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate generation retry completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                 certificateURL:
 *                   type: string
 *       400:
 *         description: Certificate is not in failed status
 *       403:
 *         description: Forbidden - Only hosts, co-hosts, or admins can retry
 *       404:
 *         description: Certificate not found
 *       500:
 *         description: Server error
 */
router.post('/:certificateId/retry', authenticateToken, retryCertificateGeneration);

/**
 * @swagger
 * /api/certificates/generate-batch:
 *   post:
 *     summary: Generate certificates for all attended users (batch processing)
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId]
 *             properties:
 *               eventId:
 *                 type: string
 *               certificateType:
 *                 type: string
 *                 enum: [participant, winner, organizer, co-organizer]
 *                 default: participant
 *     responses:
 *       200:
 *         description: Batch certificate generation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 eventId:
 *                   type: string
 *                 eventTitle:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     generated:
 *                       type: number
 *                     skipped:
 *                       type: number
 *                     failed:
 *                       type: number
 *                     certificates:
 *                       type: array
 *       400:
 *         description: Bad request - No attended users found
 *       403:
 *         description: Forbidden - Only hosts, co-hosts, or admins can generate batch certificates
 *       404:
 *         description: Event not found
 */
router.post('/generate-batch', authenticateToken, generateBatchCertificates);

/**
 * @swagger
 * /api/certificates/progress/{eventId}:
 *   get:
 *     summary: Get certificate generation progress for an event
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate generation progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eventId:
 *                   type: string
 *                 eventTitle:
 *                   type: string
 *                 totalAttended:
 *                   type: number
 *                 certificatesGenerated:
 *                   type: number
 *                 certificatesPending:
 *                   type: number
 *                 certificatesFailed:
 *                   type: number
 *                 certificatesNotGenerated:
 *                   type: number
 *                 generationProgress:
 *                   type: number
 *                 successRate:
 *                   type: number
 *       403:
 *         description: Forbidden - Only hosts, co-hosts, or admins can view progress
 *       404:
 *         description: Event not found
 */
router.get('/progress/:eventId', authenticateToken, getCertificateProgress);

/**
 * @swagger
 * /api/certificates/{certificateId}/notify:
 *   post:
 *     summary: Send certificate notification to user
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: certificateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 recipient:
 *                   type: string
 *       400:
 *         description: Bad request - Certificate must be generated
 *       403:
 *         description: Forbidden - Only hosts, co-hosts, or admins can send notifications
 *       404:
 *         description: Certificate not found
 */
router.post('/:certificateId/notify', authenticateToken, sendCertificateNotification);

/**
 * @swagger
 * /api/certificates/dashboard:
 *   get:
 *     summary: Get certificate management dashboard for hosts
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: eventId
 *         schema:
 *           type: string
 *         description: Filter by specific event
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, generated, failed]
 *         description: Filter by certificate status
 *       - in: query
 *         name: certificateType
 *         schema:
 *           type: string
 *           enum: [participant, winner, organizer, co-organizer]
 *         description: Filter by certificate type
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of certificates per page
 *     responses:
 *       200:
 *         description: Certificate dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certificates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       userName:
 *                         type: string
 *                       userEmail:
 *                         type: string
 *                       eventTitle:
 *                         type: string
 *                       certificateType:
 *                         type: string
 *                       status:
 *                         type: string
 *                       certificateURL:
 *                         type: string
 *                       issuedAt:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalCertificates:
 *                       type: integer
 *                     generated:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       date:
 *                         type: string
 */
router.get('/dashboard', authenticateToken, getCertificateDashboard);

/**
 * @swagger
 * /api/certificates/{eventId}/bulk-retry:
 *   post:
 *     summary: Bulk retry failed certificates for an event
 *     tags: [Certificate]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bulk retry completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 eventId:
 *                   type: string
 *                 eventTitle:
 *                   type: string
 *                 results:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     retried:
 *                       type: number
 *                     success:
 *                       type: number
 *                     failed:
 *                       type: number
 *                     certificates:
 *                       type: array
 *       400:
 *         description: Bad request - No failed certificates found
 *       403:
 *         description: Forbidden - Only hosts, co-hosts, or admins can retry certificates
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/bulk-retry', authenticateToken, bulkRetryFailedCertificates);

module.exports = router; 