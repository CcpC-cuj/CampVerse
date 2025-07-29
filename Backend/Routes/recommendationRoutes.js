const express = require('express');
const {
  getEventRecommendations,
  getSimilarEvents,
  updateUserPreferences
} = require('../Controller/recommendation');
const { authenticateToken } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * /api/recommendations/events:
 *   get:
 *     summary: Get personalized event recommendations for a user
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recommendations to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: Event recommendations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       eventId:
 *                         type: string
 *                       similarityScore:
 *                         type: number
 *                       reason:
 *                         type: string
 *                       event:
 *                         type: object
 *                 pagination:
 *                   type: object
 *                 userProfile:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/events', authenticateToken, getEventRecommendations);

/**
 * @swagger
 * /api/recommendations/events/{eventId}/similar:
 *   get:
 *     summary: Get similar events based on a specific event
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of similar events to return
 *     responses:
 *       200:
 *         description: Similar events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 baseEvent:
 *                   type: object
 *                 similarEvents:
 *                   type: array
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get('/events/:eventId/similar', authenticateToken, getSimilarEvents);

/**
 * @swagger
 * /api/recommendations/preferences:
 *   post:
 *     summary: Update user preferences based on event interaction
 *     tags: [Recommendations]
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
 *               - action
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: Event ID
 *               action:
 *                 type: string
 *                 enum: [view, like, attend, register]
 *                 description: User action on the event
 *     responses:
 *       200:
 *         description: User preferences updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedInterests:
 *                   type: array
 *                 updatedSkills:
 *                   type: array
 *       404:
 *         description: User or event not found
 *       500:
 *         description: Server error
 */
router.post('/preferences', authenticateToken, updateUserPreferences);

module.exports = router; 