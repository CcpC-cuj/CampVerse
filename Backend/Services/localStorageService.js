/**
 * Local Storage Service
 * Replacement for Firebase/Drive storage - stores files locally
 * This is a temporary solution - files will be lost on container restart
 */

const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');
const { logger } = require('../Middleware/errorHandler');

class LocalStorageService {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'uploads');
    this.initialized = false;
    this.init();
  }

  async init() {
    try {
      // Create uploads directory if it doesn't exist
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'events'), { recursive: true });
      await fs.mkdir(path.join(this.baseDir, 'profiles'), { recursive: true });
      this.initialized = true;
      logger.info('Local storage service initialized');
    } catch (error) {
      logger.error('Failed to initialize local storage service:', error);
    }
  }

  /**
   * Generate file path
   */
  generateFilePath(category, filename) {
    const timestamp = Date.now();
    const uniqueId = randomUUID().substring(0, 8);
    const fileExtension = path.extname(filename);
    const baseName = path.basename(filename, fileExtension);
    const cleanFilename = `${timestamp}_${uniqueId}_${baseName}${fileExtension}`;
    
    return path.join(this.baseDir, category, cleanFilename);
  }

  /**
   * Upload event image (logo or banner)
   */
  async uploadEventImage(fileBuffer, filename, type, mimetype) {
    try {
      if (!this.initialized) {
        throw new Error('Local storage service not initialized');
      }

      const filePath = this.generateFilePath('events', filename);
      await fs.writeFile(filePath, fileBuffer);
      
      // Return a relative URL that could be served by express.static
      const relativePath = path.relative(this.baseDir, filePath);
      const url = `/uploads/${relativePath.replace(/\\/g, '/')}`;
      
      logger.info(`Event ${type} uploaded locally: ${url}`);
      return url;
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
      if (!this.initialized) {
        throw new Error('Local storage service not initialized');
      }

      const filePath = this.generateFilePath('profiles', filename);
      await fs.writeFile(filePath, fileBuffer);
      
      const relativePath = path.relative(this.baseDir, filePath);
      const url = `/uploads/${relativePath.replace(/\\/g, '/')}`;
      
      logger.info(`Profile photo uploaded locally for user ${userId}: ${url}`);
      return url;
    } catch (error) {
      logger.error('Failed to upload profile photo:', error);
      throw error;
    }
  }

  /**
   * Delete file (placeholder - files are small and cleanup can be manual)
   */
  async deleteEventImage(url) {
    try {
      if (!url || !url.startsWith('/uploads/')) {
        return; // Not a local file or invalid URL
      }
      
      const relativePath = url.replace('/uploads/', '');
      const filePath = path.join(this.baseDir, relativePath);
      
      await fs.unlink(filePath);
      logger.info(`Deleted local file: ${url}`);
    } catch (error) {
      logger.warn(`Failed to delete local file ${url}:`, error.message);
      // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * Delete profile photo
   */
  async deleteProfilePhoto(url) {
    return this.deleteEventImage(url); // Same logic
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'error',
          message: 'Local storage service not initialized',
          initialized: false
        };
      }

      // Check if uploads directory exists and is writable
      const fs = require('fs').promises;
      await fs.access(this.baseDir, fs.constants.W_OK);

      return {
        status: 'healthy',
        message: 'Local storage service is operational',
        baseDir: this.baseDir,
        initialized: this.initialized
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        baseDir: this.baseDir,
        initialized: this.initialized
      };
    }
  }
}

// Create singleton instance
const localStorageService = new LocalStorageService();

module.exports = {
  uploadEventImage: (fileBuffer, filename, type, mimetype) => 
    localStorageService.uploadEventImage(fileBuffer, filename, type, mimetype),
  uploadProfilePhoto: (fileBuffer, filename, userId, mimetype) => 
    localStorageService.uploadProfilePhoto(fileBuffer, filename, userId, mimetype),
  deleteEventImage: (url) => 
    localStorageService.deleteEventImage(url),
  deleteProfilePhoto: (url) => 
    localStorageService.deleteProfilePhoto(url),
  healthCheck: () =>
    localStorageService.healthCheck(),
  localStorageService
};
