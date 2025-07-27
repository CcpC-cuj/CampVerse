const express = require('express');
const {
  register,
  verifyOtp,
  login,
  updatePreferences,
  getMe,
  getUserById,
  updateUserById,
  deleteUser,
  getUserCertificates,
  getUserAchievements,
  getUserEvents,
  grantHostAccess,
  googleSignIn,
  updateMe,
  forgotPassword,
  resetPassword,
  grantVerifierAccess,
  getDashboard,
  trackReferral,
  getUserBadges,
  requestHostAccess,
  listPendingHostRequests,
  approveHostRequest,
  rejectHostRequest
} = require('../Controller/User');

const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} = require('../Services/notification');

const {
  authenticateToken,
  requireRole,
  requireSelfOrRole
} = require('../Middleware/Auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         isVerified:
 *           type: boolean
 *         canHost:
 *           type: boolean
 *         interests:
 *           type: array
 *           items:
 *             type: string
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *         badges:
 *           type: array
 *           items:
 *             type: string
 *     Event:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *         isPaid:
 *           type: boolean
 *         verificationStatus:
 *           type: string
 *         schedule:
 *           type: object
 *           properties:
 *             start:
 *               type: string
 *               format: date-time
 *             end:
 *               type: string
 *               format: date-time
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 pattern: '.*@.*\.(ac|edu)\.in$'
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: OTP sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 otp:
 *                   type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/register', register);

/**
 * @swagger
 * /api/users/verify:
 *   post:
 *     summary: Verify OTP and complete registration
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid OTP
 *       500:
 *         description: Server error
 */
router.post('/verify', verifyOtp);

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
router.post('/login', login);

/**
 * @swagger
 * /api/users/google-signin:
 *   post:
 *     summary: Login with Google OAuth2
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Google login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid Google token or non-academic email
 *       500:
 *         description: Server error
 */
router.post('/google-signin', googleSignIn);

/**
 * @swagger
 * /api/users/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', forgotPassword);

/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token
 *       500:
 *         description: Server error
 */
router.post('/reset-password', resetPassword);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get user dashboard with statistics
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalAttended:
 *                       type: number
 *                     totalHosted:
 *                       type: number
 *                     totalSaved:
 *                       type: number
 *                     totalWaitlisted:
 *                       type: number
 *                     totalRegistered:
 *                       type: number
 *                     certificates:
 *                       type: number
 *                     achievements:
 *                       type: number
 *                     profileCompletion:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, getDashboard);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get('/me', authenticateToken, getMe);

/**
 * @swagger
 * /api/users/updatePreferences:
 *   post:
 *     summary: Update user preferences
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collegeIdNumber:
 *                 type: string
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               learningGoals:
 *                 type: array
 *                 items:
 *                   type: string
 *               badges:
 *                 type: array
 *                 items:
 *                   type: string
 *               location:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preferences updated
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/updatePreferences', authenticateToken, updatePreferences);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               Gender:
 *                 type: string
 *               DOB:
 *                 type: string
 *                 format: date
 *               profilePhoto:
 *                 type: string
 *               collegeIdNumber:
 *                 type: string
 *               interests:
 *                 type: array
 *                 items:
 *                   type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               learningGoals:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch('/me', authenticateToken, updateMe);

/**
 * @swagger
 * /api/users/track-referral:
 *   post:
 *     summary: Track user referral
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral tracked
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/track-referral', authenticateToken, trackReferral);

/**
 * @swagger
 * /api/users/badges:
 *   get:
 *     summary: Get current user badges and achievements
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User badges and achievements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 badges:
 *                   type: array
 *                   items:
 *                     type: string
 *                 achievements:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/badges', authenticateToken, getUserBadges);

/**
 * @swagger
 * /api/users/{id}/badges:
 *   get:
 *     summary: Get user badges (admin/host only)
 *     tags: [User]
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
 *         description: User badges
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get('/:id/badges', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserBadges);

/**
 * @swagger
 * /api/users/me/request-host:
 *   post:
 *     summary: Request host status
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Host request submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Already a host or request pending
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/me/request-host', authenticateToken, requestHostAccess);

/**
 * @swagger
 * /api/users/host-requests/pending:
 *   get:
 *     summary: List pending host requests (verifier only)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending host requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Verifier role required
 *       500:
 *         description: Server error
 */
router.get('/host-requests/pending', authenticateToken, requireRole('verifier'), listPendingHostRequests);

/**
 * @swagger
 * /api/users/host-requests/{id}/approve:
 *   post:
 *     summary: Approve host request (verifier only)
 *     tags: [User]
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
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Host request approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Verifier role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/host-requests/:id/approve', authenticateToken, requireRole('verifier'), approveHostRequest);

/**
 * @swagger
 * /api/users/host-requests/{id}/reject:
 *   post:
 *     summary: Reject host request (verifier only)
 *     tags: [User]
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
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Host request rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Verifier role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/host-requests/:id/reject', authenticateToken, requireRole('verifier'), rejectHostRequest);

/**
 * @swagger
 * /api/users/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: User notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   type:
 *                     type: string
 *                   message:
 *                     type: string
 *                   isRead:
 *                     type: boolean
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user.id, req.query.limit || 20);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * @swagger
 * /api/users/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [User]
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
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.id, req.user.id);
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * @swagger
 * /api/users/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await markAllNotificationsAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Only admin can delete any user
router.delete('/:id', authenticateToken, requireRole('platformAdmin'), deleteUser);

// Certificates, achievements, events (self or admin or host)
router.get('/:id/certificates', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserCertificates);
router.get('/:id/achievements', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserAchievements);
router.get('/:id/events', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserEvents);

// Host access - only platformAdmin can assign
router.post('/:id/grant-host', authenticateToken, requireRole('platformAdmin'), grantHostAccess);
// Verifier access - only platformAdmin can assign
router.post('/:id/grant-verifier', authenticateToken, requireRole('platformAdmin'), grantVerifierAccess);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     tags: [User]
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
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticateToken, requireSelfOrRole(['platformAdmin']), getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update user by ID (admin only)
 *     tags: [User]
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
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *               isVerified:
 *                 type: boolean
 *               canHost:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.patch('/:id', authenticateToken, requireSelfOrRole(['platformAdmin']), updateUserById);

module.exports = router;
