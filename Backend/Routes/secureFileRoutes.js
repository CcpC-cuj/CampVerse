/**
 * Secure File Access Routes
 * Provides authenticated access to private storage files
 */

const express = require('express');
const { authenticateToken } = require('../Middleware/JWTcheck');
const { SecureStorageService } = require('../Services/secureStorageService');
const { logger } = require('../Middleware/errorHandler');

const router = express.Router();
const secureStorage = new SecureStorageService();

/**
 * Get secure file URL for authenticated user
 * GET /api/files/secure/:fileId
 */
router.get('/secure/:userId/:category/:filename', authenticateToken, async (req, res) => {
  try {
    const { userId, category, filename } = req.params;
    
    // Verify user can only access their own files
    if (req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users files'
      });
    }

    const filePath = `CampVerse/users/${userId}/${category}/${filename}`;
    
    // Generate secure signed URL (1 hour expiry)
    const secureUrl = await secureStorage.generateSecureUrl(filePath, userId, 3600);
    
    res.json({
      success: true,
      url: secureUrl,
      expiresIn: 3600
    });

  } catch (error) {
    logger.error('Secure file access error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate secure file access'
    });
  }
});

/**
 * Upload file for authenticated user
 * POST /api/files/upload/:category
 */
router.post('/upload/:category', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user.id;

    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const file = req.files.file;
    const uploadResult = await secureStorage.uploadUserFile(
      file.data,
      file.name,
      userId,
      category,
      file.mimetype
    );

    // Generate initial secure URL
    const secureUrl = await secureStorage.generateSecureUrl(
      uploadResult.path,
      userId,
      24 * 60 * 60 // 24 hours
    );

    res.json({
      success: true,
      file: {
        ...uploadResult,
        url: secureUrl
      }
    });

  } catch (error) {
    logger.error('Secure file upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file securely'
    });
  }
});

/**
 * List user's files
 * GET /api/files/list/:category?
 */
router.get('/list/:category?', authenticateToken, async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user.id;

    const files = await secureStorage.listUserFiles(userId, category);
    
    res.json({
      success: true,
      files,
      count: files.length
    });

  } catch (error) {
    logger.error('List secure files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list files'
    });
  }
});

/**
 * Delete user's file
 * DELETE /api/files/:category/:filename
 */
router.delete('/:category/:filename', authenticateToken, async (req, res) => {
  try {
    const { category, filename } = req.params;
    const userId = req.user.id;

    const filePath = `CampVerse/users/${userId}/${category}/${filename}`;
    
    await secureStorage.deleteUserFile(filePath, userId);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    logger.error('Secure file delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
});

module.exports = router;
