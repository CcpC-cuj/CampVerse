# Storage Service Guide

## Overview
CampVerse uses a unified storage service that supports multiple storage providers through environment configuration.

## Default Configuration
- **Development**: Firebase Storage (default)
- **Production**: Firebase Storage (recommended)
- **Alternative**: Supabase Storage

## Supported Providers

### 1. Firebase Storage (Default)
Firebase Storage is the default and recommended storage provider for both development and production.

**Environment Variables:**
```env
STORAGE_PROVIDER=firebase
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com
```

**Features:**
- Google Cloud Integration
- Built-in CDN
- Automatic scaling
- Security rules
- Admin SDK support

### 2. Supabase Storage (Alternative)
Supabase Storage provides an alternative for teams preferring PostgreSQL-based solutions.

**Environment Variables:**
```env
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_BUCKET_NAME=campverse-storage
```

**Features:**
- PostgreSQL integration
- Real-time subscriptions
- Built-in authentication
- Row Level Security (RLS)

## Usage

### Basic Operations
```javascript
const { storageService } = require('./Services/driveService');

// Upload file
const uploadResult = await storageService.uploadFile(fileBuffer, fileName, folderPath);

// Delete file
await storageService.deleteFile(fileName, folderPath);

// List files
const files = await storageService.listFiles(folderPath);

// Health check
const isHealthy = await storageService.healthCheck();
```

### Backward Compatibility
Legacy function names are still supported:
```javascript
// These still work for backward compatibility
const uploadResult = await uploadPdfToStorage(fileBuffer, fileName);
const deleted = await deletePdfFromStorage(fileName);
```

## File Organization
Files are organized in structured folders:
- `certificates/` - Generated certificates
- `profiles/` - User profile images
- `events/` - Event-related files

## Environment Setup

### Development (Docker)
```yaml
# docker-compose.yml
environment:
  - STORAGE_PROVIDER=firebase
  - FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
```

### Production
Set the same environment variables in your deployment platform:
- Railway
- Heroku
- AWS
- Google Cloud

## Migration Between Providers
To switch providers:
1. Update `STORAGE_PROVIDER` environment variable
2. Configure new provider's environment variables
3. Restart the application
4. Migrate existing files if needed

## Health Monitoring
Each storage provider includes health checks accessible via the unified interface:
```javascript
const isHealthy = await storageService.healthCheck();
```

## Error Handling
The unified service provides consistent error handling across all providers:
- Upload failures return detailed error information
- Network issues are properly caught and reported
- Invalid configurations are detected at startup

## Security Considerations
- Firebase: Use service account keys or application default credentials
- Supabase: Use appropriate RLS policies and secure anon keys
- Never expose storage credentials in client-side code

## File Limits
- Maximum file size: Determined by provider (typically 50MB+)
- Supported formats: All binary and text formats
- Folder depth: No practical limit

## Development vs Production
- Development: Firebase Storage (default)
- Production: Firebase Storage (recommended)
- Testing: Any provider can be used with appropriate test buckets
