# Unified Storage Service - Multi-Provider Architecture

## Summary
Successfully implemented a flexible storage service that supports multiple storage providers (Firebase, Supabase, and Local) configurable via environment variables. This provides deployment flexibility while maintaining backward compatibility.

## Architecture Overview

### **New Unified Storage Service**
```
Controllers → driveService.js (Unified) → [Firebase | Supabase | Local] Storage
```

### **Supported Storage Providers:**
1. **Local Storage** (Default - Development)
2. **Firebase Storage** (Production - Google Cloud)
3. **Supabase Storage** (Production - Open Source)

## Implementation Details

### 1. **Created Storage Services**

#### **Firebase Storage Service** (`firebaseStorageService.js`)
- Full Firebase Storage integration with admin SDK
- Automatic service account key loading
- Organized folder structure
- Error handling and logging
- Health check functionality

#### **Supabase Storage Service** (`supabaseStorageService.js`)
- Complete Supabase Storage integration
- Public URL generation
- Bucket management
- File operations (upload/delete/list)
- Health check functionality

#### **Local Storage Service** (`localStorageService.js`)
- Local filesystem storage
- Static file serving via Express
- Development and fallback solution
- Automatic directory creation

### 2. **Unified Storage Interface** (`driveService.js`)
- **Provider Selection:** Environment variable driven (`STORAGE_PROVIDER`)
- **Dynamic Switching:** Runtime provider switching capability
- **Backward Compatibility:** Existing controller code unchanged
- **Health Monitoring:** Provider status and health checks
- **Unified API:** Same interface regardless of provider

### 3. **Environment Configuration**

#### **Provider Selection:**
```bash
STORAGE_PROVIDER=local      # Default
STORAGE_PROVIDER=firebase   # Firebase Storage
STORAGE_PROVIDER=supabase   # Supabase Storage
```

#### **Firebase Configuration:**
```bash
STORAGE_PROVIDER=firebase
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
FIREBASE_KEY_FILE=/path/to/service-account.json  # Optional
```

#### **Supabase Configuration:**
```bash
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_BUCKET_NAME=campverse-storage
```

### 4. **File Organization Structure**
All providers maintain consistent folder structure:
```
CampVerse/
├── events/
│   ├── logos/
│   └── banners/
├── users/
│   ├── profiles/
│   └── documents/
│       ├── id-cards/
│       └── permissions/
├── certificates/
│   └── {eventId}/
└── institutions/
    └── logos/
```

## Updated Dependencies

### **Added to package.json:**
- `@supabase/supabase-js`: "^2.38.0" - Supabase client
- `firebase-admin`: "^13.4.0" - Firebase admin SDK

### **Environment Variables in docker-compose.yml:**
```yaml
# Storage Configuration
- STORAGE_PROVIDER=local

# Firebase Storage (optional)
# - FIREBASE_KEY_FILE=/usr/src/app/credentials/service-account.json
# - FIREBASE_STORAGE_BUCKET=your-firebase-bucket.appspot.com

# Supabase Storage (optional)
# - SUPABASE_URL=https://your-project.supabase.co
# - SUPABASE_ANON_KEY=your-anon-key
# - SUPABASE_BUCKET_NAME=campverse-storage
```

## API Usage Examples

### **Basic Usage (Backward Compatible):**
```javascript
const { uploadEventImage, uploadProfilePhoto } = require('./Services/driveService');

// Upload event logo
const logoUrl = await uploadEventImage(fileBuffer, filename, 'logo', mimetype);

// Upload profile photo  
const photoUrl = await uploadProfilePhoto(fileBuffer, filename, userId, mimetype);
```

### **Advanced Usage:**
```javascript
const { unifiedStorageService } = require('./Services/driveService');

// Get provider information
const info = unifiedStorageService.getProviderInfo();
// { current: 'local', available: ['firebase', 'supabase', 'local'], initialized: true }

// Switch providers dynamically
unifiedStorageService.switchProvider('firebase');
unifiedStorageService.switchProvider('supabase');

// Health check
const health = await unifiedStorageService.healthCheck();
```

## Deployment Scenarios

### **Development:**
```bash
STORAGE_PROVIDER=local
```
- Files stored in `Backend/uploads/`
- Served via `/uploads/*` routes
- No external dependencies

### **Production with Firebase:**
```bash
STORAGE_PROVIDER=firebase
FIREBASE_STORAGE_BUCKET=campverse-prod.appspot.com
FIREBASE_KEY_FILE=/usr/src/app/credentials/service-account.json
```

### **Production with Supabase:**
```bash
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://abcdef.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_BUCKET_NAME=campverse-storage
```

## Benefits of New Architecture

### **1. Deployment Flexibility**
- **Development:** Local storage (no setup)
- **Staging:** Supabase (easy setup)
- **Production:** Firebase or Supabase (scalable)

### **2. Cost Optimization**
- **Development:** Free (local storage)
- **Production:** Choose based on pricing and features
- **Multi-cloud:** Can switch providers as needed

### **3. Vendor Independence**
- Not locked into single storage provider
- Easy migration between providers
- Risk mitigation for service outages

### **4. Backward Compatibility**
- Existing controller code unchanged
- Same API interface
- Gradual migration possible

### **5. Monitoring and Debugging**
- Provider-specific logging
- Health check endpoints
- Runtime provider switching for testing

## Security Features

### **Firebase:**
- Service account authentication
- Firebase Security Rules
- Signed URLs for private access
- Google Cloud IAM integration

### **Supabase:**
- Row Level Security (RLS) policies
- Bucket-level permissions
- Edge CDN with authentication
- PostgreSQL integration

### **Local:**
- File system permissions
- Express static middleware
- Development only (not production recommended)

## Performance Considerations

### **File Naming:**
- Timestamp + UUID for uniqueness
- Prevents naming conflicts
- Supports concurrent uploads

### **CDN Integration:**
- **Firebase:** Automatic CDN caching
- **Supabase:** Edge CDN available
- **Local:** Consider nginx for production

### **File Size Limits:**
- Default: 10MB per file
- Configurable in multer middleware
- Provider-specific limits respected

## Monitoring and Logging

### **Provider Status:**
```javascript
// Get current provider info
const info = unifiedStorageService.getProviderInfo();

// Health check
const health = await unifiedStorageService.healthCheck();
```

### **Logging Examples:**
```
[INFO] Storage service using provider: local
[INFO] Uploading event logo using firebase provider  
[INFO] Event logo uploaded to Firebase successfully: logo.jpg
[ERROR] Failed to upload event logo with firebase: Error message
```

## Migration Guide

### **From Local to Firebase:**
1. Set up Firebase project and storage bucket
2. Update environment variables
3. Restart application
4. Existing files remain local (optional migration)

### **From Firebase to Supabase:**
1. Set up Supabase project and storage bucket
2. Update environment variables  
3. Restart application
4. Optional: Migrate existing files using `listFiles()` API

## Future Enhancements

### **Planned Features:**
- AWS S3 provider integration
- Azure Blob Storage provider
- File compression and optimization
- Automatic file cleanup/garbage collection
- Batch upload operations
- File versioning support

### **Monitoring Improvements:**
- Storage usage metrics
- Upload success rate tracking
- Provider performance monitoring
- Cost tracking and alerts

## Testing

### **Test Script:** `scripts/testStorage.js`
```bash
node scripts/testStorage.js
```

Tests:
- Provider initialization
- Health checks
- Provider switching
- Error handling

### **Manual Testing:**
```bash
# Test provider info
node -e "console.log(require('./Services/driveService').getProviderInfo())"

# Test health check
node -e "require('./Services/driveService').healthCheck().then(console.log)"
```

## Documentation

- **Setup Guide:** `STORAGE_SERVICE_GUIDE.md`
- **API Documentation:** Inline code comments
- **Environment Examples:** `docker-compose.yml`
- **Migration Guide:** This document

## Conclusion

The unified storage service provides a robust, flexible, and scalable solution for file storage in CampVerse. It supports multiple deployment scenarios while maintaining simplicity and backward compatibility. The architecture is designed for growth and can easily accommodate new storage providers as requirements evolve.
