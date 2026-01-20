const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../Middleware/Auth');
const adminSettingsController = require('../Controller/AdminSettings');

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: Get system settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings', authenticateToken, requireRole(['platformAdmin']), adminSettingsController.getSettings);

/**
 * @swagger
 * /api/admin/settings:
 *   patch:
 *     summary: Update system settings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/settings', authenticateToken, requireRole(['platformAdmin']), adminSettingsController.updateSettings);

module.exports = router;
