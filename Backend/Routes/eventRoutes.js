const express = require('express');
const upload = require('../Middleware/upload');
const {
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
  getUserQrCode,
} = require('../Controller/event');
const {
  advancedEventSearch,
  getUserAnalytics,
  getPlatformInsights,
  getSearchAnalytics,
  getAdvancedEventAnalytics,
  getUserActivityTimeline,
  getGrowthTrends,
  getZeroResultSearches,
} = require('../Controller/analytics');
const { authenticateToken, requireRole } = require('../Middleware/Auth');
const {
  requireHostOrCoHost,
  requireVerifier,
} = require('../Middleware/permissions');
// const EventParticipationLog = require('../Models/EventParticipationLog');

const router = express.Router();

// Public list events endpoint
router.get('/', require('../Controller/event').listEvents);

// Advanced event search (filter, sort, paginate) - placed before '/:id' to avoid route collisions
router.get('/search', authenticateToken, advancedEventSearch);

// Get user's registered events (place before '/:id' to avoid collisions)
router.get('/user', authenticateToken, require('../Controller/event').getUserEvents);

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
router.post(
  '/',
  authenticateToken,
  requireRole('host'),
  upload.fields([{ name: 'logo' }, { name: 'banner' }]),
  createEvent,
);

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
router.patch(
  '/:id',
  authenticateToken,
  requireHostOrCoHost,
  upload.fields([{ name: 'logo' }, { name: 'banner' }]),
  updateEvent,
);

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
router.delete('/:id', authenticateToken, requireHostOrCoHost, deleteEvent);

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
 * /api/events/cancel-rsvp:
 *   post:
 *     summary: Cancel RSVP for event (user)
 *     tags: [Event]
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
 *             properties:
 *               eventId:
 *                 type: string
 *     responses:
 *       200: { description: RSVP cancelled }
 *       404: { description: No RSVP found }
 *       500: { description: Error cancelling RSVP }
 */
router.post('/cancel-rsvp', authenticateToken, cancelRsvp);

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
router.get(
  '/:id/participants',
  authenticateToken,
  requireHostOrCoHost,
  getParticipants,
);

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
router.post('/scan', authenticateToken, requireHostOrCoHost, scanQr);

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
router.get(
  '/:id/analytics',
  authenticateToken,
  requireRole('host'),
  getEventAnalytics,
);

/**
 * @swagger
 * /api/events/nominate-cohost:
 *   post:
 *     summary: Nominate a co-host for an event (host only)
 *     tags: [Event]
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
 *               - userId
 *             properties:
 *               eventId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200: { description: Co-host nomination submitted }
 *       400: { description: Co-host nomination already pending }
 *       403: { description: Only host can nominate }
 *       404: { description: Event not found }
 *       500: { description: Error nominating co-host }
 */
router.post('/nominate-cohost', authenticateToken, requireRole('host'), nominateCoHost);

/**
 * @swagger
 * /api/events/approve-cohost:
 *   post:
 *     summary: Approve a co-host nomination (verifier/platformAdmin only)
 *     tags: [Event]
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
 *               - userId
 *             properties:
 *               eventId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200: { description: Co-host approved }
 *       403: { description: Only verifier/platformAdmin can approve }
 *       404: { description: Co-host request not found }
 *       500: { description: Error approving co-host }
 */
router.post(
  '/approve-cohost',
  authenticateToken,
  requireVerifier,
  approveCoHost,
);

/**
 * @swagger
 * /api/events/reject-cohost:
 *   post:
 *     summary: Reject a co-host nomination (verifier/platformAdmin only)
 *     tags: [Event]
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
 *               - userId
 *             properties:
 *               eventId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200: { description: Co-host rejected }
 *       403: { description: Only verifier/platformAdmin can reject }
 *       404: { description: Co-host request not found }
 *       500: { description: Error rejecting co-host }
 */
router.post('/reject-cohost', authenticateToken, requireVerifier, rejectCoHost);

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
router.post(
  '/:id/verify',
  authenticateToken,
  requireRole('verifier'),
  verifyEvent,
);

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

// Get current user's QR code image for an event they RSVPed to
router.get('/:id/qrcode', authenticateToken, getUserQrCode);

// Advanced event search (filter, sort, paginate)
// User analytics (participation stats)
router.get('/user-analytics/:userId', authenticateToken, getUserAnalytics);
// Platform insights (global stats)
router.get(
  '/platform-insights',
  authenticateToken,
  requireRole('platformAdmin'),
  getPlatformInsights,
);
// Search analytics (admin only)
router.get(
  '/search-analytics',
  authenticateToken,
  requireRole('platformAdmin'),
  getSearchAnalytics,
);

// Advanced event analytics
router.get(
  '/:id/advanced-analytics',
  authenticateToken,
  getAdvancedEventAnalytics,
);
// User activity timeline
router.get(
  '/user-activity/:userId',
  authenticateToken,
  getUserActivityTimeline,
);
// Platform growth trends (admin only)
router.get(
  '/admin/growth-trends',
  authenticateToken,
  requireRole('platformAdmin'),
  getGrowthTrends,
);
// Zero-result searches (admin only)
router.get(
  '/admin/zero-result-searches',
  authenticateToken,
  requireRole('platformAdmin'),
  getZeroResultSearches,
);

module.exports = router;
