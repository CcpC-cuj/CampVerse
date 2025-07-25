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
  getDashboard
} = require('../controllers/userController');

const {
  authenticateToken,
  requireRole,
  requireSelfOrRole
} = require('../Middleware/Auth');

const router = express.Router();

// Public auth routes
router.post('/register', register);
router.post('/verify', verifyOtp);
router.post('/login', login);
router.post('/google-signin', googleSignIn); // Google OAuth2 sign-in
router.post('/forgot-password', forgotPassword); // Request password reset
router.post('/reset-password', resetPassword); // Reset password with token

// Authenticated user routes
router.get('/', authenticateToken, getDashboard); // User dashboard summary
router.get('/me', authenticateToken, getMe);
router.post('/updatePreferences', authenticateToken, updatePreferences);
router.patch('/me', authenticateToken, updateMe); // Update own profile

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
// Verifier access - only platformAdmin can assign
router.post('/:id/grant-verifier', authenticateToken, requireRole('platformAdmin'), grantVerifierAccess);

module.exports = router;
