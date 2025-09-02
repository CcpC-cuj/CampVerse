/**
 * Secure Storage Service
 * Integrates Supabase Storage with Google OAuth + MongoDB authentication
 * Provides secure, user-specific file access with temporary signed URLs
 */

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { logger } = require('../Middleware/errorHandler');

class SecureStorageService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'campverse';
    this.jwtSecret = process.env.JWT_SECRET;
    this.baseFolder = 'CampVerse';
    this.initialized = false;
    
    if (this.supabaseUrl && this.supabaseServiceKey) {
      // Use service role for admin operations (bypasses RLS)
      this.supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      this.initialized = true;
      logger.info('Secure Storage Service initialized with admin privileges');
    } else {
      logger.error('Supabase credentials missing for secure storage');
    }
  }

  /**
   * Upload file with user-specific access control
   */
  async uploadUserFile(fileBuffer, filename, userId, category = 'profiles', mimetype) {
    try {
      if (!this.initialized) {
        throw new Error('Secure Storage Service not initialized');
      }

      // Create user-specific file path
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 8);
      const extension = filename.split('.').pop();
      const cleanFilename = `${timestamp}_${uniqueId}_${filename}`;
      const filePath = `${this.baseFolder}/users/${userId}/${category}/${cleanFilename}`;

      // Upload using admin client (bypasses RLS)
      const { data, error } = await this.supabaseAdmin.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimetype,
          metadata: {
            originalName: filename,
            uploadedAt: new Date().toISOString(),
            userId: userId,
            category: category
          }
        });

      if (error) {
        throw new Error(`Secure upload error: ${error.message}`);
      }

      logger.info(`Secure file uploaded for user ${userId}: ${filePath}`);
      
      return {
        path: filePath,
        filename: cleanFilename,
        size: fileBuffer.length,
        mimetype,
        userId,
        uploadedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to upload secure file for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Generate secure signed URL for authorized user access
   */
  async generateSecureUrl(filePath, userId, expiresIn = 3600) {
    try {
      if (!this.initialized) {
        throw new Error('Secure Storage Service not initialized');
      }

      // Verify user has access to this file path
      if (!filePath.includes(`/users/${userId}/`)) {
        throw new Error('Unauthorized access to file');
      }

      // Generate signed URL using admin client
      const { data, error } = await this.supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Failed to generate secure URL: ${error.message}`);
      }

      logger.info(`Secure URL generated for user ${userId}: ${filePath}`);
      return data.signedUrl;
    } catch (error) {
      logger.error(`Failed to generate secure URL for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete user's file with access control
   */
  async deleteUserFile(filePath, userId) {
    try {
      if (!this.initialized) {
        throw new Error('Secure Storage Service not initialized');
      }

      // Verify user has access to this file
      if (!filePath.includes(`/users/${userId}/`)) {
        throw new Error('Unauthorized file deletion attempt');
      }

      const { error } = await this.supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      logger.info(`Secure file deleted for user ${userId}: ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete secure file for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * List user's files with access control
   */
  async listUserFiles(userId, category = null) {
    try {
      if (!this.initialized) {
        throw new Error('Secure Storage Service not initialized');
      }

      const folderPath = category 
        ? `${this.baseFolder}/users/${userId}/${category}`
        : `${this.baseFolder}/users/${userId}`;

      const { data, error } = await this.supabaseAdmin.storage
        .from(this.bucketName)
        .list(folderPath);

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error(`Failed to list files for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create a secure access token for file access
   */
  createFileAccessToken(userId, filePath, expiresIn = '1h') {
    const payload = {
      userId,
      filePath,
      type: 'file_access',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  /**
   * Verify file access token
   */
  verifyFileAccessToken(token) {
    try {
      const payload = jwt.verify(token, this.jwtSecret);
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired file access token');
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
          message: 'Secure Storage Service not initialized'
        };
      }

      // Test admin access
      const { error } = await this.supabaseAdmin.storage
        .from(this.bucketName)
        .list('', { limit: 1 });

      if (error) {
        return {
          status: 'error',
          message: `Secure Storage error: ${error.message}`
        };
      }

      return {
        status: 'healthy',
        message: 'Secure Storage Service operational',
        bucket: this.bucketName,
        security: 'enabled'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

module.exports = { SecureStorageService };
