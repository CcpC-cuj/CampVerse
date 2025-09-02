# Storage Service Configuration Guide

## Overview

The CampVerse backend supports multiple storage providers that can be configured through environment variables. This allows for flexible deployment across different environments and storage solutions.

## Supported Storage Providers

### 1. **Firebase Storage** (Default - Development & Production)
- **Provider:** `firebase`
- **Use Case:** Development and production
- **Files stored:** Firebase Cloud Storage bucket
- **Pros:** Scalable, integrated with Google services, CDN, reliable
- **Cons:** Requires Google Cloud setup

### 2. **Supabase Storage** (Alternative Production Option)
- **Provider:** `supabase`
- **Use Case:** Alternative production environment
- **Files stored:** Supabase Storage bucket
- **Pros:** Open source, PostgreSQL integration, edge CDN
- **Cons:** Requires Supabase account

## Configuration

### Environment Variables

Set the `STORAGE_PROVIDER` environment variable to choose your storage provider:

```bash
STORAGE_PROVIDER=firebase  # Default
STORAGE_PROVIDER=supabase
```

### Firebase Storage Configuration (Default)

**Environment Variables:**
```bash
STORAGE_PROVIDER=firebase  # Default, can be omitted
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com
FIREBASE_KEY_FILE=/path/to/service-account.json  # Optional
```

**Setup Steps:**
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firebase Storage
3. Create a storage bucket
4. Generate a service account key (optional - can use default credentials)
5. Set environment variables

**Example:**
```bash
STORAGE_PROVIDER=firebase
FIREBASE_STORAGE_BUCKET=campverse-prod.appspot.com
FIREBASE_KEY_FILE=/usr/src/app/credentials/service-account.json
```

### Supabase Storage Configuration

**Environment Variables:**
```bash
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anonymous-key
SUPABASE_BUCKET_NAME=campverse-storage  # Optional, defaults to 'campverse-storage'
```

**Setup Steps:**
1. Create a Supabase project at https://supabase.com
2. Go to Storage section and create a bucket named `campverse-storage`
3. Get your project URL and anon key from Settings > API
4. Set environment variables

**Example:**
```bash
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_BUCKET_NAME=campverse-storage
```

## Docker Compose Examples

### Development & Production (Firebase - Default)
```yaml
environment:
  - STORAGE_PROVIDER=firebase  # Optional, default
  - FIREBASE_STORAGE_BUCKET=campverse-prod.appspot.com
  - FIREBASE_KEY_FILE=/usr/src/app/credentials/service-account.json
volumes:
  - ./Backend/credentials:/usr/src/app/credentials:ro  # If using service account file
```

### Production with Supabase
```yaml
environment:
  - STORAGE_PROVIDER=supabase
  - SUPABASE_URL=https://your-project.supabase.co
  - SUPABASE_ANON_KEY=your-anon-key
  - SUPABASE_BUCKET_NAME=campverse-storage
```

## File Organization

All providers maintain the same folder structure:

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

## API Usage

The storage service provides a unified API regardless of the provider:

```javascript
const { 
  uploadEventImage, 
  uploadProfilePhoto, 
  deleteEventImage,
  deleteProfilePhoto 
} = require('./Services/driveService');

// Upload event logo
const logoUrl = await uploadEventImage(fileBuffer, filename, 'logo', mimetype);

// Upload profile photo
const photoUrl = await uploadProfilePhoto(fileBuffer, filename, userId, mimetype);

// Delete files
await deleteEventImage(logoUrl);
await deleteProfilePhoto(photoUrl);
```

## Advanced Usage

### Switching Providers Dynamically

```javascript
const { unifiedStorageService } = require('./Services/driveService');

// Switch to Firebase
unifiedStorageService.switchProvider('firebase');

// Switch to Supabase
unifiedStorageService.switchProvider('supabase');

// Get current provider info
const info = unifiedStorageService.getProviderInfo();
console.log(info);
// Output: { current: 'firebase', available: ['firebase', 'supabase', 'local'], initialized: true }
```

### Health Check

```javascript
const { healthCheck } = require('./Services/driveService');

const health = await healthCheck();
console.log(health);
// Output: { provider: 'firebase', status: 'healthy', message: '...', allProviders: [...] }
```

## Deployment Recommendations

### Development
- **Use:** Firebase Storage (`STORAGE_PROVIDER=firebase`)
- **Benefits:** Production-like environment, cloud storage, CDN
- **Setup:** Simple Firebase project setup

### Staging
- **Use:** Firebase Storage or Supabase Storage
- **Benefits:** Production-like environment
- **Note:** Create separate staging bucket

### Production
- **Option 1:** Firebase Storage (Default)
  - Best for Google Cloud ecosystem
  - Excellent CDN performance
  - Tight integration with other Google services
  - Reliable and scalable

- **Option 2:** Supabase Storage
  - Open source alternative
  - Great for PostgreSQL-based apps
  - Cost-effective

## Migration Between Providers

To migrate between storage providers:

1. **Export files** from current provider using `listFiles()` API
2. **Download files** to temporary storage
3. **Switch provider** in environment variables
4. **Re-upload files** to new provider
5. **Update database URLs** if necessary

## Troubleshooting

### Common Issues

1. **Files not uploading:**
   - Check provider credentials
   - Verify bucket permissions
   - Check file size limits

2. **Files not accessible:**
   - Verify bucket is public (for public files)
   - Check CORS settings
   - Validate file URLs

3. **Provider initialization fails:**
   - Check environment variables
   - Verify network connectivity
   - Check service account permissions (Firebase)

### Debug Information

```javascript
// Get provider status
const info = unifiedStorageService.getProviderInfo();
console.log('Current provider:', info.current);
console.log('Initialized:', info.initialized);

// Health check
const health = await healthCheck();
console.log('Provider health:', health);
```

## Security Considerations

### Firebase
- Use service account with minimal permissions
- Enable Firebase Security Rules
- Consider signed URLs for private files

### Supabase
- Use Row Level Security (RLS) policies
- Configure bucket permissions appropriately
- Consider private buckets for sensitive data

### Local Storage
- Files are publicly accessible via `/uploads/*`
- Not recommended for production
- Consider nginx restrictions for sensitive files

## Performance Optimization

### File Naming
- All providers use timestamp + UUID naming for uniqueness
- Organized folder structure for efficient retrieval

### Caching
- Firebase: Automatic CDN caching
- Supabase: Edge CDN available
- Local: Consider nginx caching for production

### File Size Limits
- Default: 10MB per file
- Configurable in multer middleware
- Provider-specific limits may apply

## Cost Considerations

### Local Storage
- **Cost:** Free (server storage only)
- **Bandwidth:** Server bandwidth costs

### Firebase Storage
- **Storage:** $0.026/GB/month
- **Bandwidth:** $0.12/GB (download)
- **Operations:** $0.05/10,000 (Class A), $0.004/10,000 (Class B)

### Supabase Storage
- **Storage:** $0.021/GB/month
- **Bandwidth:** $0.09/GB (download)
- **Operations:** No additional charges for standard operations

## Support and Monitoring

### Logging
All storage operations are logged with provider information:
```
[INFO] Uploading event logo using firebase provider
[INFO] Event logo uploaded to Firebase successfully: logo.jpg
[ERROR] Failed to upload event logo with firebase: Error message
```

### Monitoring
- Monitor upload success rates
- Track storage usage
- Monitor provider health status
- Set up alerts for storage failures
