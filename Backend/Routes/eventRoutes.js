const express = require('express');
const upload = require('../Middleware/upload');
const {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  rsvpEvent,
  getParticipants,
  scanQr,
  getEventAnalytics,
  nominateCoHost,
  approveCoHost,
  rejectCoHost,
  verifyEvent,
  getGoogleCalendarLink
} = require('../Controller/event');
const { authenticateToken, requireRole } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event (host/co-host)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, organizer, schedule]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               type: { type: string }
 *               organizer: { type: string }
 *               schedule: { type: object, properties: { start: { type: string, format: date-time }, end: { type: string, format: date-time } } }
 *               isPaid: { type: boolean }
 *               price: { type: number }
 *               logo: { type: string, format: binary }
 *               banner: { type: string, format: binary }
 *     responses:
 *       201: { description: Event created }
 *       403: { description: Forbidden }
 */
router.post('/', authenticateToken, requireRole('host'), upload.fields([{ name: 'logo' }, { name: 'banner' }]), createEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Event details }
 *       404: { description: Not found }
 */
router.get('/:id', authenticateToken, getEventById);

/**
 * @swagger
 * /api/events/{id}:
 *   patch:
 *     summary: Update event (host/co-host)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Event updated }
 *       403: { description: Forbidden }
 */
router.patch('/:id', authenticateToken, requireRole('host'), upload.fields([{ name: 'logo' }, { name: 'banner' }]), updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete event (host/co-host)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Event deleted }
 *       403: { description: Forbidden }
 */
router.delete('/:id', authenticateToken, requireRole('host'), deleteEvent);

/**
 * @swagger
 * /api/events/rsvp:
 *   post:
 *     summary: RSVP/register for event (user)
 *     tags: [Event]
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
 *               eventId: { type: string }
 *     responses:
 *       201: { description: RSVP successful }
 *       403: { description: Forbidden }
 */
router.post('/rsvp', authenticateToken, rsvpEvent);

/**
 * @swagger
 * /api/events/{id}/participants:
 *   get:
 *     summary: Get event participants (host/co-host)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: List of participants }
 *       403: { description: Forbidden }
 */
router.get('/:id/participants', authenticateToken, requireRole('host'), getParticipants);

/**
 * @swagger
 * /api/events/scan:
 *   post:
 *     summary: Scan QR to mark attendance (host/co-host)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, qrToken]
 *             properties:
 *               eventId: { type: string }
 *               qrToken: { type: string }
 *     responses:
 *       200: { description: Attendance marked }
 *       403: { description: Forbidden }
 */
router.post('/scan', authenticateToken, requireRole('host'), scanQr);

/**
 * @swagger
 * /api/events/{id}/analytics:
 *   get:
 *     summary: Get event analytics (host/co-host)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Event analytics }
 *       403: { description: Forbidden }
 */
router.get('/:id/analytics', authenticateToken, requireRole('host'), getEventAnalytics);

/**
 * @swagger
 * /api/events/nominate-cohost:
 *   post:
 *     summary: Nominate co-host (main host)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, userId]
 *             properties:
 *               eventId: { type: string }
 *               userId: { type: string }
 *     responses:
 *       200: { description: Co-host nomination submitted }
 *       403: { description: Forbidden }
 */
router.post('/nominate-cohost', authenticateToken, requireRole('host'), nominateCoHost);

/**
 * @swagger
 * /api/events/approve-cohost:
 *   post:
 *     summary: Approve co-host (verifier)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, userId]
 *             properties:
 *               eventId: { type: string }
 *               userId: { type: string }
 *     responses:
 *       200: { description: Co-host approved }
 *       403: { description: Forbidden }
 */
router.post('/approve-cohost', authenticateToken, requireRole('verifier'), approveCoHost);

/**
 * @swagger
 * /api/events/reject-cohost:
 *   post:
 *     summary: Reject co-host (verifier)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, userId]
 *             properties:
 *               eventId: { type: string }
 *               userId: { type: string }
 *     responses:
 *       200: { description: Co-host rejected }
 *       403: { description: Forbidden }
 */
router.post('/reject-cohost', authenticateToken, requireRole('verifier'), rejectCoHost);

/**
 * @swagger
 * /api/events/{id}/verify:
 *   post:
 *     summary: Verify event (verifier)
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Event verified }
 *       403: { description: Forbidden }
 */
router.post('/:id/verify', authenticateToken, requireRole('verifier'), verifyEvent);

/**
 * @swagger
 * /api/events/{id}/calendar-link:
 *   get:
 *     summary: Get Google Calendar link for event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Google Calendar link }
 *       404: { description: Not found }
 */
router.get('/:id/calendar-link', authenticateToken, getGoogleCalendarLink);

module.exports = router; 