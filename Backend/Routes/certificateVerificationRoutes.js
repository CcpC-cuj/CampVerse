const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middleware/Auth');
const { requireRole } = require('../Middleware/permissions');
const {
  getPendingVerifications,
  approveCertificateConfig,
  rejectCertificateConfig,
  requestConfigChanges,
  getVerificationById,
  getVerificationStats,
} = require('../Controller/certificateVerification');

/**
 * Certificate Verification Routes
 * For verifiers and platform admins to approve/reject certificate configurations
 */

// Get all pending certificate verifications
router.get(
  '/pending',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  getPendingVerifications
);

// Get verification statistics
router.get(
  '/stats',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  getVerificationStats
);

// Get specific verification details
router.get(
  '/:eventId',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  getVerificationById
);

// Approve certificate configuration
router.post(
  '/:eventId/approve',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  approveCertificateConfig
);

// Reject certificate configuration
router.post(
  '/:eventId/reject',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  rejectCertificateConfig
);

// Request changes to certificate configuration
router.post(
  '/:eventId/request-changes',
  authenticateToken,
  requireRole(['verifier', 'platformAdmin']),
  requestConfigChanges
);

module.exports = router;
