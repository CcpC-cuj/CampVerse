# CampVerse Backend Deployment Guide

## Environment Variables Required

### Required Variables:
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/campverse

# Redis (for OTP and caching)
REDIS_URL=redis://username:password@host:port

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Email Configuration (for OTP and notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-from-gmail

# Google OAuth (if using Google Sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Server Configuration
NODE_ENV=production
PORT=5001
```

### Optional Variables:
```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10

# CORS Origins (for production)
CORS_ORIGIN=https://your-frontend-domain.com

# Google Drive (for file uploads)
GOOGLE_DRIVE_CLIENT_ID=your-google-drive-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-google-drive-client-secret
GOOGLE_DRIVE_REDIRECT_URI=your-redirect-uri

# Logging
LOG_LEVEL=info
```

## Docker Deployment

### Build and Run Locally:
```bash
# Build the Docker image
docker build -t campverse-backend .

# Run the container
docker run -p 5001:5001 --env-file .env campverse-backend
```

### Docker Compose (for local development):
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - redis
      - mongo

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
```

## Deployment Platforms

### 1. Railway (Recommended)
- Connect your GitHub repo
- Add environment variables in Railway dashboard
- Deploy automatically

### 2. Render
- Connect GitHub repo
- Set build command: `docker build -t campverse-backend .`
- Set start command: `docker run -p $PORT:5001 campverse-backend`

### 3. DigitalOcean App Platform
- Connect GitHub repo
- Use Docker deployment
- Configure environment variables

### 4. AWS ECS/Fargate
- Push Docker image to ECR
- Deploy using ECS with Fargate
- Configure environment variables

## Pre-deployment Checklist

- [ ] Set up MongoDB Atlas cluster
- [ ] Set up Redis (Redis Cloud or Upstash)
- [ ] Configure Gmail App Password for email
- [ ] Set up Google OAuth credentials
- [ ] Update CORS origins for production
- [ ] Test Docker build locally
- [ ] Configure environment variables in deployment platform

## Health Check

The application includes a health check endpoint at `/health` that returns:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
``` 