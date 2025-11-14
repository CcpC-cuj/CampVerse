const express = require('express');
const {
  getHostDashboard,
  createEvent,
  updateEvent,
  deleteEvent,
  getMyEvents,
  getEventParticipants,
} = require('../Controller/host');
const { scanQr } = require('../Controller/event');
const { authenticateToken, requireRole } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * /api/hosts/dashboard:
 *   get:
 *     summary: Get host dashboard with analytics
 *     tags: [Host]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Host dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEvents:
 *                   type: number
 *                 totalParticipants:
 *                   type: number
 *                 upcomingEvents:
 *                   type: number
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a host
 */
router.get(
  '/dashboard',
  authenticateToken,
  requireRole('host'),
  getHostDashboard,
);

/**
 * @swagger
 * /api/hosts/my-events:
 *   get:
 *     summary: Get all events hosted by the current user
 *     tags: [Host]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of hosted events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a host
 */
router.get('/my-events', authenticateToken, requireRole('host'), getMyEvents);

/**
 * @swagger
 * /api/hosts/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Host]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - schedule
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               type:
 *                 type: string
 *               schedule:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               isPaid:
 *                 type: boolean
 *               price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a host
 */
router.post('/events', authenticateToken, requireRole('host'), createEvent);

/**
 * @swagger
 * /api/hosts/events/{id}:
 *   patch:
 *     summary: Update an event
 *     tags: [Host]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               schedule:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a host
 *   delete:
 *     summary: Delete an event
 *     tags: [Host]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       404:
 *         description: Event not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a host
 */
router.patch(
  '/events/:id',
  authenticateToken,
  requireRole('host'),
  updateEvent,
);
router.delete(
  '/events/:id',
  authenticateToken,
  requireRole('host'),
  deleteEvent,
);

/**
 * @swagger
 * /api/hosts/events/{id}/participants:
 *   get:
 *     summary: Get participants for an event
 *     tags: [Host]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: List of participants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 participants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       404:
 *         description: Event not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User is not a host
 */
router.get(
  '/events/:id/participants',
  authenticateToken,
  requireRole('host'),
  getEventParticipants,
);

/**
 * @swagger
 * /api/hosts/scan-qr:
 *   post:
 *     summary: Scan QR code to mark attendance (host/co-host only)
 *     tags: [Host]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - qrToken
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: Event ID
 *               qrToken:
 *                 type: string
 *                 description: QR token scanned from participant's QR code
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 participantName:
 *                   type: string
 *       400:
 *         description: Missing fields or invalid request
 *       403:
 *         description: Only host/co-host can scan
 *       404:
 *         description: Event or QR code not found
 *       409:
 *         description: QR already used or attendance already marked
 *       410:
 *         description: QR code expired
 *       429:
 *         description: Too many scan attempts
 */
router.post(
  '/scan-qr',
  authenticateToken,
  requireRole('host'),
  scanQr
);

module.exports = router;
