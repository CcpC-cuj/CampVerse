# 🚀 Render Deployment Environment Variables

## 🔐 IMPORTANT SECURITY NOTE
**These are the ONLY production credentials for Supabase. No sensitive configuration files are stored in the repository for security.**

## Storage Configuration for Production

### Required Environment Variables for Render:

```bash
# Storage Provider Selection
STORAGE_PROVIDER=supabase

# Supabase Storage Configuration
SUPABASE_URL=https://vzgvkkilpixyvzwosxcq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6Z3Zra2lscGl4eXZ6d29zeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNjYzMTcsImV4cCI6MjA3MDk0MjMxN30.H3XgwE34TtBmuQopi3lq7aRrt2NnU5hNNqJP14rP8JI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6Z3Zra2lscGl4eXZ6d29zeGNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTM2NjMxNywiZXhwIjoyMDcwOTQyMzE3fQ.LEOzZDx3_u9Wo5VHqt5VziN4jd1xqw6os-Pi9ioz0Ao
SUPABASE_BUCKET_NAME=campverse
```

## 📋 How to Set Up in Render:

1. **Go to your Render service dashboard**
2. **Navigate to Environment Variables**
3. **Add each variable above with its exact value**
4. **Deploy your service**

## 🔧 Environment Strategy:

- **Development (Local)**: Uses Firebase with hardcoded credentials
- **Production (Render)**: Uses Supabase with these environment variables

## ✅ Verified Features:

- ✅ File uploads to private Supabase bucket
- ✅ Automatic deletion of old profile photos
- ✅ Signed URL generation for secure access
- ✅ Service role authentication bypassing RLS

## 🚨 Security Notes:

- Service key provides admin access to Supabase storage
- Bucket is configured as private for security
- All file operations use service role authentication

## 📱 Bucket Configuration:

- **Bucket Name**: `campverse`
- **Privacy**: Private (requires authentication)
- **Authentication**: Service role key
- **File Structure**: `CampVerse/users/{userId}/profiles/`

---

**Copy these environment variables to your Render service for production deployment.**
