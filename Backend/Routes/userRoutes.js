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
  grantHostAccess
} = require('../controllers/userController');

const {
  authenticateToken,
  requireRole,
  requireSelfOrRole
} = require('../Middleware/auth');

const router = express.Router();

// Public auth routes
router.post('/register', register);
router.post('/verify', verifyOtp);
router.post('/login', login);

// Authenticated user routes
router.get('/me', authenticateToken, getMe);
router.post('/updatePreferences', authenticateToken, updatePreferences);

// User profile and updates (only self or admin)
router.get('/:id', authenticateToken, requireSelfOrRole(['platformAdmin']), getUserById);
router.patch('/:id', authenticateToken, requireSelfOrRole(['platformAdmin']), updateUserById);

// Only admin can delete any user
router.delete('/:id', authenticateToken, requireRole('platformAdmin'), deleteUser);

// Certificates, achievements, events (self or admin or host)
router.get('/:id/certificates', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserCertificates);
router.get('/:id/achievements', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserAchievements);
router.get('/:id/events', authenticateToken, requireSelfOrRole(['platformAdmin', 'host']), getUserEvents);

// Host access - only platformAdmin can assign
router.post('/:id/grant-host', authenticateToken, requireRole('platformAdmin'), grantHostAccess);

module.exports = router;
