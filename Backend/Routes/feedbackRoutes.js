const express = require('express');
const upload = require('../Middleware/upload');
const {
  submitFeedback,
  getMyFeedback,
  getAllFeedback,
  updateFeedbackStatus,
  getFeedbackAnalytics,
} = require('../Controller/feedback');
const { authenticateToken, requireRole } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     summary: Submit feedback (user)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [rating, category, subject, message, email]
 *             properties:
 *               rating: { type: number, minimum: 1, maximum: 5 }
 *               category: { type: string, enum: [ui, bug, feature, performance, events, other] }
 *               subject: { type: string, maxLength: 200 }
 *               message: { type: string, maxLength: 2000 }
 *               email: { type: string, format: email }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201: { description: Feedback submitted successfully }
 *       400: { description: Validation error }
 *       401: { description: Unauthorized }
 */
router.post(
  '/',
  authenticateToken,
  upload.single('attachment'),
  submitFeedback,
);

/**
 * @swagger
 * /api/feedback/my:
 *   get:
 *     summary: Get user's feedback history
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: User feedback list }
 *       401: { description: Unauthorized }
 */
router.get('/my', authenticateToken, getMyFeedback);

/**
 * @swagger
 * /api/feedback/all:
 *   get:
 *     summary: Get all feedback (admin/verifier only)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, reviewed, resolved, closed] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [ui, bug, feature, performance, events, other] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: All feedback with pagination }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Admin/verifier role required }
 */
router.get(
  '/all',
  authenticateToken,
  requireRole(['platformAdmin', 'verifier']),
  getAllFeedback,
);

/**
 * @swagger
 * /api/feedback/{id}/status:
 *   patch:
 *     summary: Update feedback status (admin/verifier only)
 *     tags: [Feedback]
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
 *               status: { type: string, enum: [pending, reviewed, resolved, closed] }
 *               adminNotes: { type: string, maxLength: 1000 }
 *     responses:
 *       200: { description: Feedback status updated }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Admin/verifier role required }
 *       404: { description: Feedback not found }
 */
router.patch(
  '/:id/status',
  authenticateToken,
  requireRole(['platformAdmin', 'verifier']),
  updateFeedbackStatus,
);

/**
 * @swagger
 * /api/feedback/analytics:
 *   get:
 *     summary: Get feedback analytics (admin only)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Feedback analytics data }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden - Admin role required }
 */
router.get(
  '/analytics',
  authenticateToken,
  requireRole('platformAdmin'),
  getFeedbackAnalytics,
);

module.exports = router;
