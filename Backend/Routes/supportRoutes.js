const express = require('express');
const upload = require('../Middleware/upload');
const {
  submitTicket,
  getMyTickets,
  getTicketById,
  getAllTickets,
  updateTicket,
  getSupportAnalytics,
} = require('../Controller/support');
const { authenticateToken, requireRole } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * /api/support/tickets:
 *   post:
 *     summary: Submit support ticket (user)
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [topic, subject, message, name, email]
 *             properties:
 *               topic: { type: string, enum: [general, technical, billing, events, account, other] }
 *               subject: { type: string, maxLength: 200 }
 *               message: { type: string, maxLength: 2000 }
 *               name: { type: string, maxLength: 100 }
 *               email: { type: string, format: email }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201: { description: Support ticket submitted successfully }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/tickets',
  authenticateToken,
  upload.single('attachment'),
  submitTicket,
);

/**
 * @swagger
 * /api/support/tickets/my:
 *   get:
 *     summary: Get user's support tickets
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User tickets list }
 *       401: { description: Unauthorized }
 */
router.get('/tickets/my', authenticateToken, getMyTickets);

/**
 * @swagger
 * /api/support/tickets/{id}:
 *   get:
 *     summary: Get support ticket by ID
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Support ticket details }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Can only view own tickets }
 *       404: { description: Ticket not found }
 */
router.get('/tickets/:id', authenticateToken, getTicketById);

/**
 * @swagger
 * /api/support/tickets:
 *   get:
 *     summary: Get all support tickets (admin/verifier only)
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, in_progress, waiting_for_user, resolved, closed] }
 *       - in: query
 *         name: topic
 *         schema: { type: string, enum: [general, technical, billing, events, account, other] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high, urgent] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: All tickets with pagination }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Admin/verifier role required }
 */
router.get(
  '/tickets',
  authenticateToken,
  requireRole(['platformAdmin', 'verifier']),
  getAllTickets,
);

/**
 * @swagger
 * /api/support/tickets/{id}:
 *   patch:
 *     summary: Update support ticket (admin/verifier only)
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [open, in_progress, waiting_for_user, resolved, closed] }
 *               priority: { type: string, enum: [low, medium, high, urgent] }
 *               assignedTo: { type: string }
 *               adminNotes: { type: string, maxLength: 1000 }
 *     responses:
 *       200: { description: Ticket updated successfully }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Admin/verifier role required }
 *       404: { description: Ticket not found }
 */
router.patch(
  '/tickets/:id',
  authenticateToken,
  requireRole(['platformAdmin', 'verifier']),
  updateTicket,
);

/**
 * @swagger
 * /api/support/analytics:
 *   get:
 *     summary: Get support analytics (admin only)
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Support analytics data }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Admin role required }
 */
router.get(
  '/analytics',
  authenticateToken,
  requireRole('platformAdmin'),
  getSupportAnalytics,
);

module.exports = router;
