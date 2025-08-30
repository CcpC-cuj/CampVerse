/**
 * Storage Service Abstraction Layer Unit Tests
 * Tests the unified storage interface and provider switching
 */

// Mock Firebase Storage Service
const mockFirebaseService = {
  initialized: true,
  uploadEventImage: jest.fn(),
  uploadProfilePhoto: jest.fn(),
  uploadUserDocument: jest.fn(),
  uploadCertificate: jest.fn(),
  uploadInstitutionLogo: jest.fn(),
  deleteFile: jest.fn(),
  listFiles: jest.fn(),
  getFileMetadata: jest.fn(),
  healthCheck: jest.fn()
};

// Mock logger
jest.mock('../../Middleware/errorHandler', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Firebase Storage Service
jest.mock('../../Services/firebaseStorageService', () => ({
  firebaseStorageService: mockFirebaseService
}));

const { StorageService, storageService } = require('../../Services/storageService');

describe('Storage Service Abstraction Layer Unit Tests', () => {
  let service;
  let mockFileBuffer;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StorageService();
    mockFileBuffer = Buffer.from('test file content');
    
    // Setup default mock implementations
    mockFirebaseService.uploadEventImage.mockResolvedValue('https://firebase.com/event-image.jpg');
    mockFirebaseService.uploadProfilePhoto.mockResolvedValue('https://firebase.com/profile.jpg');
    mockFirebaseService.uploadUserDocument.mockResolvedValue('https://firebase.com/document.pdf');
    mockFirebaseService.uploadCertificate.mockResolvedValue('https://firebase.com/certificate.pdf');
    mockFirebaseService.uploadInstitutionLogo.mockResolvedValue('https://firebase.com/logo.png');
    mockFirebaseService.deleteFile.mockResolvedValue(true);
    mockFirebaseService.listFiles.mockResolvedValue([]);
    mockFirebaseService.getFileMetadata.mockResolvedValue({ name: 'test.jpg' });
    mockFirebaseService.healthCheck.mockResolvedValue({ status: 'healthy' });
  });

  describe('StorageService Initialization', () => {
    it('should initialize with Firebase as default provider', () => {
      expect(service.defaultProvider).toBe('firebase');
      expect(service.currentProvider).toBe(mockFirebaseService);
    });

    it('should get provider info correctly', () => {
      const info = service.getProviderInfo();
      
      expect(info).toEqual({
        current: 'firebase',
        available: ['firebase'],
        initialized: true
      });
    });
  });

  describe('Provider Switching', () => {
    it('should switch providers successfully', () => {
      expect(() => service.switchProvider('firebase')).not.toThrow();
      expect(service.defaultProvider).toBe('firebase');
    });

    it('should throw error for invalid provider', () => {
      expect(() => service.switchProvider('invalid-provider')).toThrow(
        'Storage provider \'invalid-provider\' not available'
      );
    });
  });

  describe('uploadEventImage', () => {
    it('should upload event image successfully', async () => {
      const result = await service.uploadEventImage(
        mockFileBuffer,
        'logo.jpg',
        'logo',
        'image/jpeg'
      );

      expect(mockFirebaseService.uploadEventImage).toHaveBeenCalledWith(
        mockFileBuffer,
        'logo.jpg',
        'logo',
        'image/jpeg'
      );
      expect(result).toBe('https://firebase.com/event-image.jpg');
    });

    it('should handle upload errors', async () => {
      mockFirebaseService.uploadEventImage.mockRejectedValue(new Error('Upload failed'));

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

      expect(mockFirebaseService.uploadProfilePhoto).toHaveBeenCalledWith(
        mockFileBuffer,
        'avatar.jpg',
        'user123',
        'image/jpeg'
      );
      expect(result).toBe('https://firebase.com/profile.jpg');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const result = await service.deleteFile('https://firebase.com/test.jpg');

      expect(mockFirebaseService.deleteFile).toHaveBeenCalledWith('https://firebase.com/test.jpg');
      expect(result).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return health status successfully', async () => {
      const mockHealth = { status: 'healthy', message: 'All good' };
      mockFirebaseService.healthCheck.mockResolvedValue(mockHealth);

      const result = await service.healthCheck();

      expect(result).toEqual({
        ...mockHealth,
        provider: 'firebase',
        availableProviders: ['firebase']
      });
    });
  });

  describe('Future Features', () => {
    it('should throw error for unimplemented migration feature', async () => {
      await expect(
        service.migrateFiles('firebase', 'googleDrive', 'events/logos')
      ).rejects.toThrow('File migration feature not yet implemented');
    });

    it('should throw error for unimplemented backup feature', async () => {
      await expect(
        service.backupFiles('events/logos', 'googleDrive')
      ).rejects.toThrow('File backup feature not yet implemented');
    });
  });

  describe('Singleton Instance', () => {
    it('should export singleton instance functions', async () => {
      const { 
        uploadEventImage,
        uploadProfilePhoto,
        deleteFile,
        listFiles,
        healthCheck
      } = require('../../Services/storageService');

      // Test that exported functions work
      await uploadEventImage(mockFileBuffer, 'test.jpg', 'logo', 'image/jpeg');
      expect(mockFirebaseService.uploadEventImage).toHaveBeenCalled();

      await uploadProfilePhoto(mockFileBuffer, 'avatar.jpg', 'user123', 'image/jpeg');
      expect(mockFirebaseService.uploadProfilePhoto).toHaveBeenCalled();

      await deleteFile('https://test.com/file.jpg');
      expect(mockFirebaseService.deleteFile).toHaveBeenCalled();

      await listFiles('events/logos');
      expect(mockFirebaseService.listFiles).toHaveBeenCalled();

      await healthCheck();
      expect(mockFirebaseService.healthCheck).toHaveBeenCalled();
    });
  });
});