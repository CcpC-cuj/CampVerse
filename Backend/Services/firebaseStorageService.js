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

const admin = require('firebase-admin');
const path = require('path');
const { randomUUID } = require('crypto');
const { logger } = require('../Middleware/errorHandler');

class FirebaseStorageService {
  constructor() {
    this.initialized = false;
    this.bucket = null;
    this.baseFolder = 'CampVerse';
    
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps.length) {
        const serviceAccount = this.loadServiceAccount();
        
        if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
          });
        } else {
          admin.initializeApp({
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
          });
        }
      }

      // Get storage bucket
      const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'ccpccuj.appspot.com';
      this.bucket = admin.storage().bucket(bucketName);
      this.initialized = true;
      
      logger.info('Firebase Storage Service initialized');
    } catch (error) {
      logger.error('Failed to initialize Firebase Storage Service:', error);
      this.initialized = false;
    }
  }

  loadServiceAccount() {
    const keyPath = process.env.FIREBASE_KEY_FILE;
    if (!keyPath) return null;

    try {
      const fs = require('fs');
      return JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } catch (error) {
      logger.warn('Could not load Firebase service account key:', error.message);
      return null;
    }
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
      if (!this.initialized) {
        throw new Error('Firebase Storage Service not initialized');
      }

      const file = this.bucket.file(filePath);
      const token = randomUUID();
      
      const uploadMetadata = {
        metadata: {
          contentType: mimetype,
          metadata: {
            firebaseStorageDownloadTokens: token,
            originalName: filename,
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        }
      };

      await file.save(fileBuffer, uploadMetadata);
      
      const url = `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
      
      logger.info(`File uploaded to Firebase successfully: ${filePath}`);
      
      return {
        url,
        path: filePath,
        filename: file.name,
        token,
        size: fileBuffer.length
      };
    } catch (error) {
      logger.error(`Failed to upload file to Firebase: ${filePath}`, error);
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
      
      logger.info(`Event ${type} uploaded to Firebase successfully: ${filename}`);
      return result.url; // Return URL for backward compatibility
    } catch (error) {
      logger.error(`Failed to upload event ${type} to Firebase:`, error);
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
      
      logger.info(`Profile photo uploaded to Firebase successfully for user: ${userId}`);
      return result.url; // Return URL for backward compatibility
    } catch (error) {
      logger.error(`Failed to upload profile photo to Firebase for user ${userId}:`, error);
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
      
      logger.info(`User document uploaded to Firebase successfully: ${documentType} for user ${userId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload user document to Firebase:', error);
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
      
      logger.info(`Certificate uploaded to Firebase successfully for event ${eventId}, user ${userId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload certificate to Firebase:', error);
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
      
      logger.info(`Institution logo uploaded to Firebase successfully for institution: ${institutionId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload institution logo to Firebase:', error);
      throw error;
    }
  }

  /**
   * Delete file from Firebase Storage
   */
  async deleteFile(fileUrl) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase Storage Service not initialized');
      }

      if (!fileUrl) {
        logger.warn('No file URL provided for deletion');
        return false;
      }

      logger.info(`Attempting to delete Firebase file: ${fileUrl}`);

      let filePath = null;
      
      // Extract file path from Firebase Storage URL
      if (fileUrl.includes('firebasestorage.googleapis.com')) {
        const match = fileUrl.match(/\/o\/([^?]+)/);
        if (match) {
          filePath = decodeURIComponent(match[1]);
          logger.info(`Extracted file path from Firebase URL: ${filePath}`);
        }
      } else {
        // Handle legacy URLs or direct paths
        const match = fileUrl.match(/\/CampVerse\/.*$/);
        if (match) {
          filePath = match[0].substring(1);
          logger.info(`Extracted legacy file path: ${filePath}`);
        }
      }

      if (!filePath) {
        logger.warn(`Could not extract file path from Firebase URL: ${fileUrl}`);
        return false;
      }

      logger.info(`Deleting Firebase file at path: ${filePath}`);
      await this.bucket.file(filePath).delete();
      
      logger.info(`File deleted from Firebase successfully: ${filePath}`);
      return true;
    } catch (error) {
      if (error.code === 404) {
        logger.warn(`File not found for deletion in Firebase: ${fileUrl}`);
        return false;
      }
      
      logger.error(`Failed to delete file from Firebase: ${fileUrl}`, error);
      return false; // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderPath) {
    try {
      if (!this.initialized) {
        throw new Error('Firebase Storage Service not initialized');
      }

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
      
      logger.info(`Listed ${validFiles.length} files in Firebase folder: ${folderPath}`);
      return validFiles;
    } catch (error) {
      logger.error(`Failed to list files in Firebase folder: ${folderPath}`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'error',
          message: 'Firebase Storage service not initialized',
          initialized: false
        };
      }

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
        bucket: this.bucket?.name,
        initialized: this.initialized
      };
    }
  }
}

// Create singleton instance
const firebaseStorageService = new FirebaseStorageService();

module.exports = {
  FirebaseStorageService,
  firebaseStorageService
};
