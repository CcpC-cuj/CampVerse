/**
 * Storage Service Abstraction Layer
 * Provides a unified interface for different storage providers
 * Currently supports Firebase Storage, with easy extensibility for Google Drive, AWS S3, etc.
 */

const { firebaseStorageService } = require('./firebaseStorageService');
const { logger } = require('../Middleware/errorHandler');

class StorageService {
  constructor() {
    this.providers = {
      firebase: firebaseStorageService,
      // Future providers can be added here:
      // googleDrive: googleDriveService,
      // awsS3: awsS3Service,
      // azureBlob: azureBlobService
    };
    
    // Default provider from environment or fallback to Firebase
    this.defaultProvider = process.env.STORAGE_PROVIDER || 'firebase';
    this.currentProvider = this.providers[this.defaultProvider];
    
    if (!this.currentProvider) {
      logger.error(`Storage provider '${this.defaultProvider}' not found. Falling back to Firebase.`);
      this.currentProvider = this.providers.firebase;
      this.defaultProvider = 'firebase';
    }
    
    logger.info(`Storage service initialized with provider: ${this.defaultProvider}`);
  }

  /**
   * Switch storage provider dynamically
   */
  switchProvider(providerName) {
    if (!this.providers[providerName]) {
      throw new Error(`Storage provider '${providerName}' not available`);
    }
    
    this.currentProvider = this.providers[providerName];
    this.defaultProvider = providerName;
    
    logger.info(`Switched to storage provider: ${providerName}`);
    return this;
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    return {
      current: this.defaultProvider,
      available: Object.keys(this.providers),
      initialized: this.currentProvider?.initialized || false
    };
  }

  /**
   * Upload event image (logo or banner)
   */
  async uploadEventImage(fileBuffer, filename, type, mimetype) {
    try {
      logger.info(`Uploading event ${type} using ${this.defaultProvider} provider`);
      return await this.currentProvider.uploadEventImage(fileBuffer, filename, type, mimetype);
    } catch (error) {
      logger.error(`Failed to upload event ${type} with ${this.defaultProvider}:`, error);
      throw error;
    }
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(fileBuffer, filename, userId, mimetype) {
    try {
      logger.info(`Uploading profile photo for user ${userId} using ${this.defaultProvider} provider`);
      return await this.currentProvider.uploadProfilePhoto(fileBuffer, filename, userId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload profile photo with ${this.defaultProvider}:`, error);
      throw error;
    }
  }

  /**
   * Upload user document
   */
  async uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype) {
    try {
      logger.info(`Uploading user document (${documentType}) for user ${userId} using ${this.defaultProvider} provider`);
      return await this.currentProvider.uploadUserDocument(fileBuffer, filename, documentType, userId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload user document with ${this.defaultProvider}:`, error);
      throw error;
    }
  }

  /**
   * Upload certificate
   */
  async uploadCertificate(fileBuffer, filename, eventId, userId, mimetype) {
    try {
      logger.info(`Uploading certificate for event ${eventId}, user ${userId} using ${this.defaultProvider} provider`);
      return await this.currentProvider.uploadCertificate(fileBuffer, filename, eventId, userId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload certificate with ${this.defaultProvider}:`, error);
      throw error;
    }
  }

  /**
   * Upload institution logo
   */
  async uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype) {
    try {
      logger.info(`Uploading institution logo for ${institutionId} using ${this.defaultProvider} provider`);
      return await this.currentProvider.uploadInstitutionLogo(fileBuffer, filename, institutionId, mimetype);
    } catch (error) {
      logger.error(`Failed to upload institution logo with ${this.defaultProvider}:`, error);
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(fileUrl) {
    try {
      logger.info(`Deleting file using ${this.defaultProvider} provider`);
      return await this.currentProvider.deleteFile(fileUrl);
    } catch (error) {
      logger.error(`Failed to delete file with ${this.defaultProvider}:`, error);
      throw error;
    }
  }

  /**
   * List files in folder
   */
  async listFiles(folderPath) {
    try {
      logger.info(`Listing files in ${folderPath} using ${this.defaultProvider} provider`);
      return await this.currentProvider.listFiles(folderPath);
    } catch (error) {
      logger.error(`Failed to list files with ${this.defaultProvider}:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(filePath) {
    try {
      return await this.currentProvider.getFileMetadata(filePath);
    } catch (error) {
      logger.error(`Failed to get file metadata with ${this.defaultProvider}:`, error);
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
        ...providerHealth,
        provider: this.defaultProvider,
        availableProviders: Object.keys(this.providers)
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        provider: this.defaultProvider,
        availableProviders: Object.keys(this.providers)
      };
    }
  }

  /**
   * Migrate files between providers (future feature)
   */
  async migrateFiles(fromProvider, toProvider, folderPath) {
    // This would be implemented when multiple providers are available
    throw new Error('File migration feature not yet implemented');
  }

  /**
   * Backup files to secondary provider (future feature)
   */
  async backupFiles(folderPath, backupProvider) {
    // This would be implemented for redundancy
    throw new Error('File backup feature not yet implemented');
  }
}

// Create singleton instance
const storageService = new StorageService();

// Export the service and individual functions for backward compatibility
module.exports = {
  StorageService,
  storageService,
  
  // Backward compatibility exports
  uploadEventImage: storageService.uploadEventImage.bind(storageService),
  uploadProfilePhoto: storageService.uploadProfilePhoto.bind(storageService),
  uploadUserDocument: storageService.uploadUserDocument.bind(storageService),
  uploadCertificate: storageService.uploadCertificate.bind(storageService),
  uploadInstitutionLogo: storageService.uploadInstitutionLogo.bind(storageService),
  deleteFile: storageService.deleteFile.bind(storageService),
  listFiles: storageService.listFiles.bind(storageService),
  getFileMetadata: storageService.getFileMetadata.bind(storageService),
  healthCheck: storageService.healthCheck.bind(storageService),
  
  // Legacy compatibility
  deleteEventImage: storageService.deleteFile.bind(storageService),
  deleteProfilePhoto: storageService.deleteFile.bind(storageService)
};