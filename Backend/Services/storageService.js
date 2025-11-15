/**
 * Unified Storage Service
 * Provides a single interface that switches between Firebase and Supabase
 * based on environment configuration
 * 
 * Usage:
 * const { storageService } = require('./Services/storageService');
 * await storageService.uploadCertificateLogo(buffer, filename, eventId, 'organization', mimetype);
 * 
 * Environment Variables:
 * STORAGE_PROVIDER=firebase|supabase (default: firebase)
 */

const { firebaseStorageService } = require('./firebaseStorageService');
const { supabaseStorageService } = require('./supabaseStorageService');
const { logger } = require('../Middleware/errorHandler');

class UnifiedStorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'firebase';
    this.service = null;
    this.initializeService();
  }

  initializeService() {
    try {
      if (this.provider === 'supabase') {
        this.service = supabaseStorageService;
        logger.info('Unified Storage Service: Using Supabase as storage provider');
      } else {
        this.service = firebaseStorageService;
        logger.info('Unified Storage Service: Using Firebase as storage provider');
      }

      if (!this.service.initialized) {
        logger.warn(`${this.provider.charAt(0).toUpperCase() + this.provider.slice(1)} storage service not properly initialized`);
      }
    } catch (error) {
      logger.error('Failed to initialize Unified Storage Service:', error);
      // Fallback to Firebase
      this.service = firebaseStorageService;
      this.provider = 'firebase';
    }
  }

  /**
   * Get current storage provider
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Check if service is initialized
   */
  isInitialized() {
    return this.service && this.service.initialized;
  }

  // ============================================================================
  // EVENT UPLOADS
  // ============================================================================

  async uploadEventImage(fileBuffer, filename, type, mimetype) {
    return this.service.uploadEventImage(fileBuffer, filename, type, mimetype);
  }

  // ============================================================================
  // USER UPLOADS
  // ============================================================================

  async uploadProfilePhoto(fileBuffer, filename, userId, mimetype) {
    return this.service.uploadProfilePhoto(fileBuffer, filename, userId, mimetype);
  }

  async uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype) {
    return this.service.uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype);
  }

  // ============================================================================
  // CERTIFICATE ASSET UPLOADS (Templates, Logos, Signatures)
  // ============================================================================

  /**
   * Upload certificate template
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} eventId - Event ID
   * @param {string} templateType - 'participation' or 'achievement'
   * @param {string} mimetype - MIME type
   * @returns {Promise<{url: string, path: string, filename: string, size: number}>}
   */
  async uploadCertificateTemplate(fileBuffer, filename, eventId, templateType, mimetype) {
    try {
      logger.info(`Uploading certificate template to ${this.provider}: ${filename}`);
      return await this.service.uploadCertificateTemplate(
        fileBuffer,
        filename,
        eventId,
        templateType,
        mimetype
      );
    } catch (error) {
      logger.error('Unified Storage Service: Failed to upload certificate template', error);
      throw error;
    }
  }

  /**
   * Upload certificate logo (organization logo)
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} eventId - Event ID
   * @param {string} logoType - 'organization', 'left', 'right'
   * @param {string} mimetype - MIME type
   * @returns {Promise<{url: string, path: string, filename: string, size: number}>}
   */
  async uploadCertificateLogo(fileBuffer, filename, eventId, logoType, mimetype) {
    try {
      logger.info(`Uploading certificate logo to ${this.provider}: ${filename}`);
      return await this.service.uploadCertificateLogo(
        fileBuffer,
        filename,
        eventId,
        logoType,
        mimetype
      );
    } catch (error) {
      logger.error('Unified Storage Service: Failed to upload certificate logo', error);
      throw error;
    }
  }

  /**
   * Upload certificate signature
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - Original filename
   * @param {string} eventId - Event ID
   * @param {string} signatureType - 'left' or 'right'
   * @param {string} mimetype - MIME type
   * @returns {Promise<{url: string, path: string, filename: string, size: number}>}
   */
  async uploadCertificateSignature(fileBuffer, filename, eventId, signatureType, mimetype) {
    try {
      logger.info(`Uploading certificate signature to ${this.provider}: ${filename}`);
      return await this.service.uploadCertificateSignature(
        fileBuffer,
        filename,
        eventId,
        signatureType,
        mimetype
      );
    } catch (error) {
      logger.error('Unified Storage Service: Failed to upload certificate signature', error);
      throw error;
    }
  }

  // ============================================================================
  // CERTIFICATE GENERATION (Not stored, just metadata)
  // NOTE: Certificates are NOT stored in cloud storage - they are rendered on-demand
  // This method is kept for backward compatibility but should not be used for new implementations
  // ============================================================================

  async uploadCertificate(fileBuffer, filename, eventId, userId, mimetype) {
    logger.warn('uploadCertificate called - Certificates should be rendered on-demand, not stored');
    return this.service.uploadCertificate(fileBuffer, filename, eventId, userId, mimetype);
  }

  // ============================================================================
  // INSTITUTION UPLOADS
  // ============================================================================

  async uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype) {
    return this.service.uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype);
  }

  // ============================================================================
  // FILE MANAGEMENT
  // ============================================================================

  async deleteFile(fileUrl) {
    return this.service.deleteFile(fileUrl);
  }

  async getFileInfo(filePath) {
    if (this.service.getFileInfo) {
      return this.service.getFileInfo(filePath);
    }
    throw new Error('getFileInfo not implemented for this storage provider');
  }

  /**
   * Generate file path (utility method)
   */
  generateFilePath(category, subcategory, filename, userId = null) {
    if (this.service.generateFilePath) {
      return this.service.generateFilePath(category, subcategory, filename, userId);
    }
    throw new Error('generateFilePath not implemented for this storage provider');
  }
}

// Create singleton instance
const storageService = new UnifiedStorageService();

module.exports = {
  UnifiedStorageService,
  storageService
};
