/**
 * Drive Service - Legacy Compatibility Layer
 * 
 * This file maintains backward compatibility with existing code while
 * delegating all operations to the new Firebase Storage Service.
 * 
 * DEPRECATED: Use firebaseStorageService.js or storageService.js directly
 * for new implementations.
 * 
 * Future Storage Options:
 * - Firebase Storage (Current) ✅
 * - Google Drive (Future) 🔄
 * - AWS S3 (Future) 🔄
 * - Azure Blob Storage (Future) 🔄
 */

const { 
  upload,
  uploadEventImage,
  deleteEventImage,
  uploadProfilePhoto,
  deleteProfilePhoto
} = require('./firebaseStorageService');

const { logger } = require('../Middleware/errorHandler');

// Log deprecation warning (only once)
let warningLogged = false;
if (!warningLogged) {
  logger.warn('driveService.js is deprecated. Please use firebaseStorageService.js or storageService.js for new implementations.');
  warningLogged = true;
}

// Re-export all functions for backward compatibility
module.exports = {
  upload,
  uploadEventImage,
  deleteEventImage,
  uploadProfilePhoto,
  deleteProfilePhoto,
};