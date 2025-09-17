/**
 * Firebase Storage Service Unit Tests
 * Comprehensive testing for all storage operations
 */

// Mock Firebase file
const mockFile = {
  save: jest.fn(),
  delete: jest.fn(),
  getMetadata: jest.fn(),
  getSignedUrl: jest.fn(),
  name: 'test-file.jpg'
};

// Mock Firebase admin
jest.mock('../../firebase', () => ({
  name: 'test-bucket.appspot.com',
  file: jest.fn(() => mockFile),
  getFiles: jest.fn(),
  getMetadata: jest.fn()
}));

// Mock logger
jest.mock('../../Middleware/errorHandler', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const {
  FirebaseStorageService,
  firebaseStorageService,
  uploadEventImage,
  uploadProfilePhoto,
  uploadUserDocument,
  uploadCertificate,
  uploadInstitutionLogo,
  deleteEventImage,
  deleteProfilePhoto,
  listFiles,
  getFileMetadata
} = require('../../Services/firebaseStorageService');

const mockBucket = require('../../firebase');

describe('Firebase Storage Service Unit Tests', () => {
  let service;
  let mockFileBuffer;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FirebaseStorageService();
    mockFileBuffer = Buffer.from('test file content');
    
    // Setup default mock implementations
    mockBucket.file.mockReturnValue(mockFile);
    mockFile.save.mockResolvedValue(undefined);
    mockFile.delete.mockResolvedValue(undefined);
    mockFile.getMetadata.mockResolvedValue([{
      name: 'test-file.jpg',
      size: '1024',
      contentType: 'image/jpeg',
      timeCreated: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z',
      metadata: {}
    }]);
    mockFile.getSignedUrl.mockResolvedValue(['https://signed-url.com']);
    mockBucket.getFiles.mockResolvedValue([[]]);
    mockBucket.getMetadata.mockResolvedValue([{ name: 'test-bucket' }]);
  });

  describe('FirebaseStorageService Class', () => {
    it('should initialize correctly', () => {
      expect(service.bucket).toBe(mockBucket);
      expect(service.baseFolder).toBe('CampVerse');
      expect(service.initialized).toBe(true);
    });

    it('should generate correct file paths', () => {
      const filePath = service.generateFilePath('events', 'logos', 'test.jpg');
      expect(filePath).toMatch(/^CampVerse\/events\/logos\/\d+_[a-f0-9-]+_test\.jpg$/);
    });

    it('should generate correct file paths with userId', () => {
      const filePath = service.generateFilePath('users', 'profiles', 'avatar.jpg', 'user123');
      expect(filePath).toMatch(/^CampVerse\/users\/user123\/profiles\/\d+_[a-f0-9-]+_avatar\.jpg$/);
    });
  });

  describe('uploadEventImage', () => {
    it('should upload event logo successfully', async () => {
      const result = await service.uploadEventImage(
        mockFileBuffer,
        'logo.jpg',
        'logo',
        'image/jpeg'
      );

      expect(mockBucket.file).toHaveBeenCalled();
      expect(mockFile.save).toHaveBeenCalledWith(
        mockFileBuffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          metadata: expect.objectContaining({
            originalName: 'logo.jpg',
            category: 'event',
            type: 'logo',
            fileType: 'image'
          })
        })
      );
      expect(result).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it('should reject invalid file types', async () => {
      await expect(
        service.uploadEventImage(mockFileBuffer, 'document.pdf', 'logo', 'application/pdf')
      ).rejects.toThrow('Invalid file type: application/pdf');
    });

    it('should handle upload errors', async () => {
      mockFile.save.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.uploadEventImage(mockFileBuffer, 'logo.jpg', 'logo', 'image/jpeg')
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadProfilePhoto', () => {
    it('should upload profile photo successfully', async () => {
      const result = await service.uploadProfilePhoto(
        mockFileBuffer,
        'avatar.jpg',
        'user123',
        'image/jpeg'
      );

      expect(mockFile.save).toHaveBeenCalledWith(
        mockFileBuffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          metadata: expect.objectContaining({
            category: 'profile',
            userId: 'user123',
            fileType: 'image'
          })
        })
      );
      expect(result).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it('should reject invalid file types for profile photos', async () => {
      await expect(
        service.uploadProfilePhoto(mockFileBuffer, 'document.txt', 'user123', 'text/plain')
      ).rejects.toThrow('Invalid file type: text/plain');
    });
  });

  describe('uploadUserDocument', () => {
    it('should upload ID card successfully', async () => {
      const result = await service.uploadUserDocument(
        mockFileBuffer,
        'id-card.jpg',
        'id-cards',
        'user123',
        'image/jpeg'
      );

      expect(mockFile.save).toHaveBeenCalledWith(
        mockFileBuffer,
        expect.objectContaining({
          metadata: expect.objectContaining({
            category: 'user_document',
            documentType: 'id-cards',
            userId: 'user123',
            fileType: 'image'
          })
        })
      );
      expect(result).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it('should upload PDF document successfully', async () => {
      const result = await service.uploadUserDocument(
        mockFileBuffer,
        'permission.pdf',
        'permissions',
        'user123',
        'application/pdf'
      );

      expect(mockFile.save).toHaveBeenCalledWith(
        mockFileBuffer,
        expect.objectContaining({
          metadata: expect.objectContaining({
            documentType: 'permissions',
            fileType: 'document'
          })
        })
      );
      expect(result).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it('should reject invalid document types', async () => {
      await expect(
        service.uploadUserDocument(mockFileBuffer, 'video.mp4', 'videos', 'user123', 'video/mp4')
      ).rejects.toThrow('Invalid file type: video/mp4');
    });
  });

  describe('deleteFile', () => {
    it('should delete file with Firebase Storage URL', async () => {
      const fileUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/CampVerse%2Fevents%2Flogos%2Ftest.jpg?alt=media&token=123';
      
      const result = await service.deleteFile(fileUrl);

      expect(mockFile.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle file not found', async () => {
      mockFile.delete.mockRejectedValue({ code: 404 });
      
      const result = await service.deleteFile('https://firebasestorage.googleapis.com/v0/b/bucket/o/nonexistent.jpg');

      expect(result).toBe(false);
    });

    it('should handle invalid URLs', async () => {
      const result = await service.deleteFile('invalid-url');

      expect(mockFile.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list files in folder successfully', async () => {
      const mockFiles = [
        { 
          name: 'file1.jpg',
          getMetadata: jest.fn().mockResolvedValue([{
            size: '1024',
            contentType: 'image/jpeg',
            timeCreated: '2024-01-01T00:00:00Z',
            updated: '2024-01-01T00:00:00Z'
          }]),
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url-1.com'])
        }
      ];

      mockBucket.getFiles.mockResolvedValue([mockFiles]);

      const result = await service.listFiles('events/logos');

      expect(mockBucket.getFiles).toHaveBeenCalledWith({
        prefix: 'CampVerse/events/logos'
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'file1.jpg',
        path: 'file1.jpg',
        url: 'https://signed-url-1.com',
        size: '1024',
        contentType: 'image/jpeg',
        timeCreated: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z'
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        message: 'Firebase Storage service is operational',
        bucket: 'test-bucket.appspot.com',
        initialized: true
      });
    });

    it('should return error status when bucket is inaccessible', async () => {
      mockBucket.getMetadata.mockRejectedValue(new Error('Access denied'));

      const result = await service.healthCheck();

      expect(result).toEqual({
        status: 'error',
        message: 'Access denied',
        bucket: 'test-bucket.appspot.com',
        initialized: true
      });
    });
  });

  describe('Backward Compatibility Functions', () => {
    it('should call uploadEventImage through compatibility function', async () => {
      const result = await uploadEventImage(mockFileBuffer, 'logo.jpg', 'logo', 'image/jpeg');
      expect(result).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it('should call uploadProfilePhoto through compatibility function', async () => {
      const result = await uploadProfilePhoto(mockFileBuffer, 'avatar.jpg', 'user123', 'image/jpeg');
      expect(result).toMatch(/^https:\/\/firebasestorage\.googleapis\.com/);
    });

    it('should call deleteFile through deleteEventImage compatibility function', async () => {
      const result = await deleteEventImage('https://firebasestorage.googleapis.com/test.jpg');
      expect(result).toBe(true);
    });
  });
});