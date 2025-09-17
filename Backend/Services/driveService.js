/**
 * Unified Storage Service - Supports Multiple Storage Providers
 * 
 * This service can switch between different storage providers based on environment variables:
 * - Firebase Storage (Default - Development & Production)
 * - Supabase Storage (Alternative Production Option)
 * 
 * Set STORAGE_PROVIDER environment variable to one of: 'firebase', 'supabase'
 * Default: 'firebase' (for development and production)
 * 
 * Environment Variables Required:
 * 
 * For Firebase (Default):
 * - STORAGE_PROVIDER=firebase (or not set)
 * - FIREBASE_KEY_FILE=path/to/service-account.json (optional)
 * - FIREBASE_STORAGE_BUCKET=your-bucket-name
 * 
 * For Supabase:
 * - STORAGE_PROVIDER=supabase
 * - SUPABASE_URL=your-supabase-url
 * - SUPABASE_ANON_KEY=your-anon-key
 * - SUPABASE_BUCKET_NAME=your-bucket-name (optional, defaults to 'campverse-storage')
 */

const { logger } = require('../Middleware/errorHandler');

class UnifiedStorageService {
  constructor() {
    this.providers = {};
    this.currentProvider = null;
    this.providerName = process.env.STORAGE_PROVIDER || 'firebase';
    
    this.initializeProviders();
    this.selectProvider();
  }

  initializeProviders() {
    try {
      // Initialize available providers
      const { firebaseStorageService } = require('./firebaseStorageService');
      const { supabaseStorageService } = require('./supabaseStorageService');

      this.providers = {
        firebase: firebaseStorageService,
        supabase: supabaseStorageService
      };

      logger.info('Storage providers initialized (Firebase, Supabase)');
    } catch (error) {
      logger.error('Failed to initialize storage providers:', error);
    }
  }

  selectProvider() {
    const provider = this.providers[this.providerName];
    
    if (!provider) {
      logger.error(`Storage provider '${this.providerName}' not found. Falling back to Firebase.`);
      this.currentProvider = this.providers.firebase;
      this.providerName = 'firebase';
    } else {
      this.currentProvider = provider;
    }

    logger.info(`Storage service using provider: ${this.providerName}`);
  }

  /**
   * Switch storage provider dynamically
   */
  switchProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`Storage provider '${providerName}' not available`);
    }
    
    this.currentProvider = this.providers[providerName];
    this.providerName = providerName;
    
    logger.info(`Switched to storage provider: ${providerName}`);
    return this;
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      current: this.providerName,
      available: Object.keys(this.providers),
      initialized: this.currentProvider?.initialized || false
    };
  }

  /**
   * Upload event image (logo or banner)
   */
  async uploadEventImage(fileBuffer, filename, type, mimetype) {
    try {
      logger.info(`Uploading event ${type} using ${this.providerName} provider`);
      return await this.currentProvider.uploadEventImage(fileBuffer, filename, type, mimetype);
    } catch (error) {
      logger.error(`Failed to upload event ${type} with ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(fileBuffer, filename, userId, mimetype) {
    try {
      logger.info(`Uploading profile photo for user ${userId} using ${this.providerName} provider`);
      return await this.currentProvider.uploadProfilePhoto(fileBuffer, filename, userId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload profile photo with ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Upload user document
   */
  async uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype) {
    try {
      logger.info(`Uploading user document (${documentType}) for user ${userId} using ${this.providerName} provider`);
      return await this.currentProvider.uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload user document with ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Upload certificate
   */
  async uploadCertificate(fileBuffer, filename, eventId, userId, mimetype) {
    try {
      logger.info(`Uploading certificate for event ${eventId}, user ${userId} using ${this.providerName} provider`);
      return await this.currentProvider.uploadCertificate(fileBuffer, filename, eventId, userId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload certificate with ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Upload institution logo
   */
  async uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype) {
    try {
      logger.info(`Uploading institution logo for ${institutionId} using ${this.providerName} provider`);
      return await this.currentProvider.uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload institution logo with ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Delete event image
   */
  async deleteEventImage(fileUrl) {
    try {
      logger.info(`Deleting event image using ${this.providerName} provider`);
      return await this.currentProvider.deleteFile(fileUrl);
    } catch (error) {
      logger.error(`Failed to delete event image with ${this.providerName}:`, error);
      return false; // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * Delete profile photo
   */
  async deleteProfilePhoto(fileUrl) {
    try {
      logger.info(`Deleting profile photo using ${this.providerName} provider`);
      return await this.currentProvider.deleteFile(fileUrl);
    } catch (error) {
      logger.error(`Failed to delete profile photo with ${this.providerName}:`, error);
      return false; // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * Delete any file
   */
  async deleteFile(fileUrl) {
    try {
      logger.info(`Deleting file using ${this.providerName} provider`);
      return await this.currentProvider.deleteFile(fileUrl);
    } catch (error) {
      logger.error(`Failed to delete file with ${this.providerName}:`, error);
      return false; // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderPath) {
    try {
      logger.info(`Listing files in ${folderPath} using ${this.providerName} provider`);
      return await this.currentProvider.listFiles(folderPath);
    } catch (error) {
      logger.error(`Failed to list files with ${this.providerName}:`, error);
      throw error;
    }
  }

  /**
   * Health check for current provider
   */
  async healthCheck() {
    try {
      const providerHealth = await this.currentProvider.healthCheck();
      return {
        provider: this.providerName,
        ...providerHealth,
        allProviders: Object.keys(this.providers)
      };
    } catch (error) {
      return {
        provider: this.providerName,
        status: 'error',
        message: error.message,
        allProviders: Object.keys(this.providers)
      };
    }
  }
}

// Create singleton instance
const unifiedStorageService = new UnifiedStorageService();

// Export functions for backward compatibility with existing controllers
module.exports = {
  // Main service class
  UnifiedStorageService,
  unifiedStorageService,

  // Backward compatibility functions - delegates to current provider
  uploadEventImage: (fileBuffer, filename, type, mimetype) => 
    unifiedStorageService.uploadEventImage(fileBuffer, filename, type, mimetype),
    
  uploadProfilePhoto: (fileBuffer, filename, userId, mimetype) => 
    unifiedStorageService.uploadProfilePhoto(fileBuffer, filename, userId, mimetype),
    
  deleteEventImage: (fileUrl) => 
    unifiedStorageService.deleteEventImage(fileUrl),
    
  deleteProfilePhoto: (fileUrl) => 
    unifiedStorageService.deleteProfilePhoto(fileUrl),

  // Enhanced functions
  uploadUserDocument: (fileBuffer, filename, documentType, userId, mimetype) => 
    unifiedStorageService.uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype),
    
  uploadCertificate: (fileBuffer, filename, eventId, userId, mimetype) => 
    unifiedStorageService.uploadCertificate(fileBuffer, filename, eventId, userId, mimetype),
    
  uploadInstitutionLogo: (fileBuffer, filename, institutionId, mimetype) => 
    unifiedStorageService.uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype),
    
  listFiles: (folderPath) => 
    unifiedStorageService.listFiles(folderPath),
    
  deleteFile: (fileUrl) => 
    unifiedStorageService.deleteFile(fileUrl),
    
  healthCheck: () => 
    unifiedStorageService.healthCheck(),

  // Utility functions
  switchProvider: (providerName) => 
    unifiedStorageService.switchProvider(providerName),
    
  getProviderInfo: () => 
    unifiedStorageService.getProviderInfo()
};