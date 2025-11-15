/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage with organized folder structure
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

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { randomUUID } = require('crypto');
const { logger } = require('../Middleware/errorHandler');

class SupabaseStorageService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // For admin operations
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'campverse-storage';
    this.baseFolder = 'CampVerse';
    this.initialized = false;
    
    if (this.supabaseUrl && this.supabaseAnonKey) {
      // Client for authenticated operations
      this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
      
      // Admin client for operations that bypass RLS (if service key provided)
      if (this.supabaseServiceKey) {
        this.supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
      }
      
      this.initialized = true;
      logger.info('Supabase Storage Service initialized with authentication');
    } else {
      logger.error('Supabase credentials missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
    }
  }

  /**
   * Create authenticated Supabase client for a specific user
   * This method would need to be called with proper JWT token
   */
  createAuthenticatedClient(userToken) {
    if (!userToken) {
      return this.supabaseAdmin || this.supabase; // Fallback to admin or anon client
    }
    
    const authClient = createClient(this.supabaseUrl, this.supabaseAnonKey);
    authClient.auth.setSession({ access_token: userToken, refresh_token: null });
    return authClient;
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
   * Upload file to Supabase Storage (Private)
   */
  async uploadFile(fileBuffer, filename, filePath, mimetype, metadata = {}, _userToken = null) {
    try {
      if (!this.initialized) {
        throw new Error('Supabase Storage Service not initialized');
      }

      // Use admin client for upload to bypass RLS, or authenticated client
      const client = this.supabaseAdmin || this.supabase;
      
      const { data, error } = await client.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimetype,
          metadata: {
            originalName: filename,
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        });

      if (error) {
        throw new Error(`Supabase upload error: ${error.message}`);
      }

      // For private storage, generate a signed URL instead of public URL
      const { data: signedUrlData, error: urlError } = await client.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, 365 * 24 * 60 * 60); // 1 year expiry

      if (urlError) {
        logger.warn(`Could not generate signed URL for ${filePath}, falling back to path`);
        // Return the path for later URL generation
        return {
          url: filePath, // Store path instead of URL
          path: filePath,
          filename: data.path,
          size: fileBuffer.length,
          mimetype,
          isPrivate: true
        };
      }

      logger.info(`File uploaded to Supabase successfully: ${filePath}`);
      
      return {
        url: signedUrlData.signedUrl,
        path: filePath,
        filename: data.path,
        size: fileBuffer.length,
        mimetype,
        isPrivate: true
      };
    } catch (error) {
      logger.error(`Failed to upload file to Supabase: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * Generate signed URL for private file access
   */
  async generateSignedUrl(filePath, expiresIn = 3600) {
    try {
      if (!this.initialized) {
        throw new Error('Supabase Storage Service not initialized');
      }

      const client = this.supabaseAdmin || this.supabase;
      const { data, error } = await client.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      logger.error(`Failed to generate signed URL for: ${filePath}`, error);
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
      
      logger.info(`Event ${type} uploaded to Supabase successfully: ${filename}`);
      return result.url; // Return URL for backward compatibility
    } catch (error) {
      logger.error(`Failed to upload event ${type} to Supabase:`, error);
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
      
      logger.info(`Profile photo uploaded to Supabase successfully for user: ${userId}`);
      return result.url; // Return URL for backward compatibility
    } catch (error) {
      logger.error(`Failed to upload profile photo to Supabase for user ${userId}:`, error);
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
      
      logger.info(`User document uploaded to Supabase successfully: ${documentType} for user ${userId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload user document to Supabase:', error);
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
      
      logger.info(`Certificate uploaded to Supabase successfully for event ${eventId}, user ${userId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload certificate to Supabase:', error);
      throw error;
    }
  }

  /**
   * Upload certificate template
   */
  async uploadCertificateTemplate(fileBuffer, filename, eventId, templateType, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = `${this.baseFolder}/certificates/assets/${eventId}/templates/${templateType}_${Date.now()}_${filename}`;
      
      const metadata = {
        category: 'certificate-template',
        eventId,
        templateType,
        fileType: 'image'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`Certificate template uploaded to Supabase successfully for event ${eventId}, type: ${templateType}`);
      return result;
    } catch (error) {
      logger.error('Failed to upload certificate template to Supabase:', error);
      throw error;
    }
  }

  /**
   * Upload certificate logo (organization logo)
   */
  async uploadCertificateLogo(fileBuffer, filename, eventId, logoType, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = `${this.baseFolder}/certificates/assets/${eventId}/logos/${logoType}_${Date.now()}_${filename}`;
      
      const metadata = {
        category: 'certificate-logo',
        eventId,
        logoType,
        fileType: 'image'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`Certificate logo uploaded to Supabase successfully for event ${eventId}, type: ${logoType}`);
      return result;
    } catch (error) {
      logger.error('Failed to upload certificate logo to Supabase:', error);
      throw error;
    }
  }

  /**
   * Upload certificate signature
   */
  async uploadCertificateSignature(fileBuffer, filename, eventId, signatureType, mimetype) {
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimetype)) {
        throw new Error(`Invalid file type: ${mimetype}. Allowed types: ${allowedTypes.join(', ')}`);
      }

      const filePath = `${this.baseFolder}/certificates/assets/${eventId}/signatures/${signatureType}_${Date.now()}_${filename}`;
      
      const metadata = {
        category: 'certificate-signature',
        eventId,
        signatureType,
        fileType: 'image'
      };

      const result = await this.uploadFile(fileBuffer, filename, filePath, mimetype, metadata);
      
      logger.info(`Certificate signature uploaded to Supabase successfully for event ${eventId}, type: ${signatureType}`);
      return result;
    } catch (error) {
      logger.error('Failed to upload certificate signature to Supabase:', error);
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
      
      logger.info(`Institution logo uploaded to Supabase successfully for institution: ${institutionId}`);
      return result.url;
    } catch (error) {
      logger.error('Failed to upload institution logo to Supabase:', error);
      throw error;
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(fileUrl) {
    try {
      if (!this.initialized) {
        throw new Error('Supabase Storage Service not initialized');
      }

      if (!fileUrl) {
        logger.warn('No file URL provided for deletion');
        return false;
      }

      logger.info(`Starting deletion for URL: ${fileUrl}`);

      // Extract filename from the URL - works for both public and signed URLs
      let filename = null;
      
      // For Supabase URLs, the filename is at the end of the path before any query parameters
      if (fileUrl.includes(this.supabaseUrl)) {
        // Remove query parameters (like ?token=...)
        const urlWithoutQuery = fileUrl.split('?')[0];
        // Get the last part of the path (the filename)
        const pathParts = urlWithoutQuery.split('/');
        filename = pathParts[pathParts.length - 1];
        
        logger.info(`Extracted filename: ${filename}`);
        
        // Since we know the file structure, we can find the user ID from the URL
        const userMatch = fileUrl.match(/\/users\/([^/]+)\/profiles\//);
        if (userMatch && userMatch[1]) {
          const userId = userMatch[1];
          const filePath = `CampVerse/users/${userId}/profiles/${filename}`;
          
          logger.info(`Constructed file path: ${filePath}`);
          
          // Use admin client for deletion to bypass RLS
          const client = this.supabaseAdmin || this.supabase;
          const { error } = await client.storage
            .from(this.bucketName)
            .remove([filePath]);

          if (error) {
            logger.error(`Deletion failed: ${error.message}`);
            return false;
          }

          logger.info(`File deleted successfully: ${filePath}`);
          return true;
        }
      }

      logger.warn(`Could not extract file information from URL: ${fileUrl}`);
      return false;
    } catch (error) {
      logger.error(`Failed to delete file from Supabase: ${fileUrl}`, error);
      return false; // Don't throw - deletion failures shouldn't break the app
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(folderPath) {
    try {
      if (!this.initialized) {
        throw new Error('Supabase Storage Service not initialized');
      }

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(`${this.baseFolder}/${folderPath}`);

      if (error) {
        throw new Error(`Supabase list error: ${error.message}`);
      }

      const fileList = data.map(file => {
        const fullPath = `${this.baseFolder}/${folderPath}/${file.name}`;
        const { data: urlData } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fullPath);

        return {
          name: file.name,
          path: fullPath,
          url: urlData.publicUrl,
          size: file.metadata?.size || 0,
          contentType: file.metadata?.mimetype || 'unknown',
          timeCreated: file.created_at,
          updated: file.updated_at
        };
      });

      logger.info(`Listed ${fileList.length} files in Supabase folder: ${folderPath}`);
      return fileList;
    } catch (error) {
      logger.error(`Failed to list files in Supabase folder: ${folderPath}`, error);
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
          message: 'Supabase Storage service not initialized',
          initialized: false
        };
      }

      // Test bucket access by trying to list files
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });

      if (error) {
        return {
          status: 'error',
          message: `Supabase Storage error: ${error.message}`,
          bucket: this.bucketName,
          initialized: this.initialized
        };
      }

      return {
        status: 'healthy',
        message: 'Supabase Storage service is operational',
        bucket: this.bucketName,
        initialized: this.initialized
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        bucket: this.bucketName,
        initialized: this.initialized
      };
    }
  }
}

// Create singleton instance
const supabaseStorageService = new SupabaseStorageService();

module.exports = {
  SupabaseStorageService,
  supabaseStorageService
};
