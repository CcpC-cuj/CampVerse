/**
 * Firebase Storage Service
 * Handles file uploads to Firebase Storage with organized folder structure
 * 
 * Folder Structure:
 * CampVerse/
 * ├── events/
 * │   ├── logos/
 * │   └── banners/
 * ├── users/
 * │   ├── profiles/
 * │   └── documents/
 * │       ├── id-cards/
 * │       └── permissions/
 * ├── certificates/
 * │   └── {eventId}/
 * └── institutions/
 *     └── logos/
 */

const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');
const { logger } = require('../Middleware/errorHandler');

// Firebase Storage integration
const bucket = require('../firebase');

class FirebaseStorageService {
  constructor() {
    this.bucket = bucket;
    this.baseFolder = 'CampVerse';
    this.initialized = true;
  }

  /**
   * Generate organized file path with timestamp and unique ID
   */
  generateFilePath(category, subcategory, filename, userId = null) {
    const timestamp = Date.now();
    const uniqueId = randomUUID().substring(0, 8);
    const fileExtension = path.extname(filename);
    const baseName = path.basename(filename, fileExtension);
    const cleanFilename = `${timestamp}_${uniqueId}_${baseName}${fileExtension}`;
    
    if (userId) {
      return `${this.baseFolder}/${category}/${userId}/${subcategory}/${cleanFilename}`;
    }
    return `${this.baseFolder}/${category}/${subcategory}/${cleanFilename}`;
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(fileBuffer, filename, filePath, mimetype, metadata = {}) {
    try {
      const file = this.bucket.file(filePath);
      const token = randomUUID();
      
      const uploadMetadata = {
        contentType: mimetype,
        metadata: {
          firebaseStorageDownloadTokens: token,
          originalName: filename,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      };

      await file.save(fileBuffer, uploadMetadata);
      
      const url = `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
      
      logger.info(`File uploaded successfully: ${filePath}`);
      
      return {
        url,
        path: filePath,
        filename: file.name,
        token,
        size: fileBuffer.length
      };
    } catch (error) {
      logger.error(`Failed to upload file: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Upload event image (logo or banner)
   */
  async uploadEventImage(fileBuffer, filename, type, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = this.generateFilePath('events', `${type}s`, filename);
      
      const metadata = {
        category: 'event',
        type,
        fileType: 'image'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`Event ${type} uploaded successfully: ${filename}`);
      return result.url; // Return URL for backward compatibility
    } catch (error) {
      logger.error(`Failed to upload event ${type}:`, error);
      throw error;
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(fileBuffer, filename, userId, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = this.generateFilePath('users', 'profiles', filename, userId);
      
      const metadata = {
        category: 'profile',
        userId,
        fileType: 'image'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`Profile photo uploaded successfully for user: ${userId}`);
      return result.url; // Return URL for backward compatibility
    } catch (error) {
      logger.error(`Failed to upload profile photo for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Upload user document (ID card, event permission, etc.)
   */
  async uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = this.generateFilePath('users', `documents/${documentType}`, filename, userId);
      
      const metadata = {
        category: 'user_document',
        documentType,
        userId,
        fileType: mimetype.includes('image') ? 'image' : 'document'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`User document uploaded successfully: ${documentType} for user ${userId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload user document:', error);
      throw error;
    }
  }

  /**
   * Upload certificate
   */
  async uploadCertificate(fileBuffer, filename, eventId, userId, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = this.generateFilePath('certificates', eventId, filename, userId);
      
      const metadata = {
        category: 'certificate',
        eventId,
        userId,
        fileType: mimetype.includes('pdf') ? 'pdf' : 'image'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`Certificate uploaded successfully for event ${eventId}, user ${userId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload certificate:', error);
      throw error;
    }
  }

  /**
   * Upload institution logo
   */
  async uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = this.generateFilePath('institutions', 'logos', filename, institutionId);
      
      const metadata = {
        category: 'institution',
        institutionId,
        fileType: 'image'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`Institution logo uploaded successfully for institution: ${institutionId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload institution logo:', error);
      throw error;
    }
  }

  /**
   * Delete file from Firebase Storage
   */
  async deleteFile(fileUrl) {
    try {
      if (!fileUrl) {
        logger.warn('No file URL provided for deletion');
        return false;
      }

      let filePath = null;
      
      // Extract file path from Firebase Storage URL
      if (fileUrl.includes('firebasestorage.googleapis.com')) {
        const match = fileUrl.match(/\/o\/([^?]+)/);
        if (match) {
          filePath = decodeURIComponent(match[1]);
        }
      } else {
        // Handle legacy URLs or direct paths
        const match = fileUrl.match(/\/CampVerse\/.*$/);
        if (match) {
          filePath = match[0].substring(1);
        }
      }

      if (!filePath) {
        logger.warn(`Could not extract file path from URL: ${fileUrl}`);
        return false;
      }

      await this.bucket.file(filePath).delete();
      
      logger.info(`File deleted successfully: ${filePath}`);
      return true;
    } catch (error) {
      if (error.code === 404) {
        logger.warn(`File not found for deletion: ${fileUrl}`);
        return false;
      }
      
      logger.error(`Failed to delete file: ${fileUrl}`, error);
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderPath) {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `${this.baseFolder}/${folderPath}`
      });

      const fileList = await Promise.all(
        files.map(async (file) => {
          try {
            const [metadata] = await file.getMetadata();
            const [url] = await file.getSignedUrl({
              action: 'read',
              expires: Date.now() + 15 * 60 * 1000 // 15 minutes
            });

            return {
              name: file.name,
              path: file.name,
              url,
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              updated: metadata.updated
            };
          } catch (error) {
            logger.warn(`Failed to get metadata for file: ${file.name}`, error);
            return null;
          }
        })
      );

      const validFiles = fileList.filter(file => file !== null);
      
      logger.info(`Listed ${validFiles.length} files in folder: ${folderPath}`);
      return validFiles;
    } catch (error) {
      logger.error(`Failed to list files in folder: ${folderPath}`, error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath) {
    try {
      const file = this.bucket.file(filePath);
      const [metadata] = await file.getMetadata();
      
      return {
        name: metadata.name,
        size: metadata.size,
        contentType: metadata.contentType,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        customMetadata: metadata.metadata || {}
      };
    } catch (error) {
      logger.error(`Failed to get file metadata: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Test bucket access
      await this.bucket.getMetadata();
      
      return {
        status: 'healthy',
        message: 'Firebase Storage service is operational',
        bucket: this.bucket.name,
        initialized: this.initialized
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        bucket: this.bucket.name,
        initialized: this.initialized
      };
    }
  }
}

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) and PDF documents are allowed!'));
    }
  },
});

// Create singleton instance
const firebaseStorageService = new FirebaseStorageService();

// Export functions for backward compatibility with existing code
async function uploadEventImage(fileBuffer, filename, type, mimetype) {
  return await firebaseStorageService.uploadEventImage(fileBuffer, filename, type, mimetype);
}

async function deleteEventImage(fileUrl) {
  return await firebaseStorageService.deleteFile(fileUrl);
}

async function uploadProfilePhoto(fileBuffer, filename, userId, mimetype) {
  return await firebaseStorageService.uploadProfilePhoto(fileBuffer, filename, userId, mimetype);
}

async function deleteProfilePhoto(fileUrl) {
  return await firebaseStorageService.deleteFile(fileUrl);
}

// New functions for enhanced functionality
async function uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype) {
  return await firebaseStorageService.uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype);
}

async function uploadCertificate(fileBuffer, filename, eventId, userId, mimetype) {
  return await firebaseStorageService.uploadCertificate(fileBuffer, filename, eventId, userId, mimetype);
}

async function uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype) {
  return await firebaseStorageService.uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype);
}

async function listFiles(folderPath) {
  return await firebaseStorageService.listFiles(folderPath);
}

async function getFileMetadata(filePath) {
  return await firebaseStorageService.getFileMetadata(filePath);
}

module.exports = {
  // Service class
  FirebaseStorageService,
  firebaseStorageService,
  
  // Multer upload middleware
  upload,
  
  // Backward compatibility functions
  uploadEventImage,
  deleteEventImage,
  uploadProfilePhoto,
  deleteProfilePhoto,
  
  // Enhanced functions
  uploadUserDocument,
  uploadCertificate,
  uploadInstitutionLogo,
  listFiles,
  getFileMetadata,
  
  // Utility functions
  deleteFile: firebaseStorageService.deleteFile.bind(firebaseStorageService),
  healthCheck: firebaseStorageService.healthCheck.bind(firebaseStorageService)
};