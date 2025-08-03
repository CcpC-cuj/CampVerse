const express = require('express');
const {
  createInstitution,
  getInstitutions,
  getInstitutionById,
  updateInstitution,
  deleteInstitution,
  requestInstitutionVerification,
  approveInstitutionVerification,
  rejectInstitutionVerification,
  getInstitutionAnalytics,
  getPendingInstitutionRequests,
  getInstitutionDashboard
} = require('../Controller/institution');
const { authenticateToken, requireRole } = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * /api/institutions:
 *   post:
 *     summary: Create a new institution (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, location, emailDomain]
 *             properties:
 *               name: { type: string }
 *               type: { type: string, enum: [college, university, org, temporary] }
 *               location: { type: object, properties: { city: { type: string }, state: { type: string }, country: { type: string } } }
 *               emailDomain: { type: string }
 *     responses:
 *       201: { description: Institution created }
 *       403: { description: Forbidden }
 */
router.post('/', authenticateToken, requireRole('platformAdmin'), createInstitution);

/**
 * @swagger
 * /api/institutions:
 *   get:
 *     summary: Get all institutions (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of institutions }
 *       403: { description: Forbidden }
 */
router.get('/', authenticateToken, requireRole('platformAdmin'), getInstitutions);

/**
 * @swagger
 * /api/institutions/{id}:
 *   get:
 *     summary: Get institution by ID (admin or self)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution details }
 *       403: { description: Forbidden }
 */
router.get('/:id', authenticateToken, getInstitutionById);

/**
 * @swagger
 * /api/institutions/{id}:
 *   patch:
 *     summary: Update institution (admin only)
 *     tags: [Institution]
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
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200: { description: Institution updated }
 *       403: { description: Forbidden }
 */
router.patch('/:id', authenticateToken, requireRole('platformAdmin'), updateInstitution);

/**
 * @swagger
 * /api/institutions/{id}:
 *   delete:
 *     summary: Delete institution (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution deleted }
 *       403: { description: Forbidden }
 */
router.delete('/:id', authenticateToken, requireRole('platformAdmin'), deleteInstitution);

/**
 * @swagger
 * /api/institutions/{id}/request-verification:
 *   post:
 *     summary: Request institution verification (student)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Verification request submitted }
 *       403: { description: Forbidden }
 */
router.post('/:id/request-verification', authenticateToken, requestInstitutionVerification);

/**
 * @swagger
 * /api/institutions/{id}/approve-verification:
 *   post:
 *     summary: Approve institution verification (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution verified }
 *       403: { description: Forbidden }
 */
router.post('/:id/approve-verification', authenticateToken, requireRole('platformAdmin'), approveInstitutionVerification);

/**
 * @swagger
 * /api/institutions/{id}/reject-verification:
 *   post:
 *     summary: Reject institution verification (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution verification rejected }
 *       403: { description: Forbidden }
 */
router.post('/:id/reject-verification', authenticateToken, requireRole('platformAdmin'), rejectInstitutionVerification);

/**
 * @swagger
 * /api/institutions/pending-requests:
 *   get:
 *     summary: Get pending institution verification requests (admin only)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of pending institution requests }
 *       403: { description: Forbidden }
 */
router.get('/pending-requests', authenticateToken, requireRole('platformAdmin'), getPendingInstitutionRequests);

/**
 * @swagger
 * /api/institutions/{id}/analytics:
 *   get:
 *     summary: Get institution analytics (institution or admin)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution analytics }
 *       403: { description: Forbidden }
 */
router.get('/:id/analytics', authenticateToken, getInstitutionAnalytics);

/**
 * @swagger
 * /api/institutions/{id}/dashboard:
 *   get:
 *     summary: Get institution dashboard (institution or admin)
 *     tags: [Institution]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200: { description: Institution dashboard }
 *       403: { description: Forbidden }
 */
router.get('/:id/dashboard', authenticateToken, getInstitutionDashboard);

module.exports = router; 