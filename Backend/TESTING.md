# CampVerse Backend Testing Guide

## 🚀 Quick Start with Docker

### 1. Start Development Environment
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Check services status
docker-compose -f docker-compose.dev.yml ps
```

### 2. Access Services
- **Backend API**: http://localhost:5001
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **MongoDB Express**: http://localhost:8081 (admin/admin123)

### 3. Test APIs
```bash
# Run automated tests
./test-api.sh

# Or test manually with curl
curl http://localhost:5001/health
```

## 📋 API Endpoints to Test

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `POST /api/users/google-signin` - Google OAuth
- `POST /api/users/verify` - Email verification
- `POST /api/users/complete-profile` - Complete profile after Google signup

### User Management
- `GET /api/users/me` - Get current user
- `GET /api/users` - Get dashboard
- `PATCH /api/users/me` - Update profile
- `POST /api/users/request-institution-verification` - Request institution verification

### Admin Functions
- `GET /api/events/platform-insights` - Platform analytics
- `GET /api/institutions` - List institutions
- `GET /api/institutions/pending-requests` - Pending verification requests
- `GET /api/certificates/stats` - Certificate statistics

### Event Management
- `POST /api/events` - Create event
- `GET /api/events/search` - Search events
- `POST /api/events/:id/rsvp` - RSVP for event

### Certificate Management
- `POST /api/certificates/generate` - Generate certificate
- `GET /api/certificates/stats` - Certificate statistics
- `GET /api/certificates/dashboard` - Certificate dashboard

## 🔧 Development Commands

### Docker Commands
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend-dev

# Stop services
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up --build -d
```

### Database Access
```bash
# Connect to MongoDB
docker exec -it campverse_mongo_1 mongosh

# Connect to Redis
docker exec -it campverse_redis_1 redis-cli
```

## 🧪 Testing Scenarios

### 1. User Registration Flow
```bash
# Register new user
curl -X POST http://localhost:5001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@cuj.ac.in",
    "phone": "1234567890",
    "password": "testpass123"
  }'

# Verify email with OTP
curl -X POST http://localhost:5001/api/users/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@cuj.ac.in",
    "otp": "123456"
  }'
```

### 2. Google Sign-in Flow
```bash
# Google sign-in (mock)
curl -X POST http://localhost:5001/api/users/google-signin \
  -H "Content-Type: application/json" \
  -d '{
    "token": "mock_google_token__test@cuj.ac.in"
  }'

# Complete profile
curl -X POST http://localhost:5001/api/users/complete-profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "1234567890",
    "interests": ["technology", "programming"],
    "skills": ["JavaScript", "React"],
    "learningGoals": ["Full Stack Development"]
  }'
```

### 3. Admin Functions
```bash
# Get platform insights
curl -X GET http://localhost:5001/api/events/platform-insights \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get pending institution requests
curl -X GET http://localhost:5001/api/institutions/pending-requests \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## 🔍 Monitoring

### Health Checks
- Backend: http://localhost:5001/health
- MongoDB Express: http://localhost:8081

### Logs
```bash
# Backend logs
docker-compose -f docker-compose.dev.yml logs -f backend-dev

# MongoDB logs
docker-compose -f docker-compose.dev.yml logs -f mongo

# Redis logs
docker-compose -f docker-compose.dev.yml logs -f redis
```

## 🐛 Debugging

### Common Issues
1. **Port conflicts**: Change ports in docker-compose.dev.yml
2. **Database connection**: Check MongoDB and Redis are running
3. **Email sending**: Verify EMAIL_USER and EMAIL_PASSWORD in environment

### Debug Commands
```bash
# Check container status
docker ps

# View container logs
docker logs campverse_backend-dev_1

# Access container shell
docker exec -it campverse_backend-dev_1 sh

# Check network connectivity
docker network ls
docker network inspect campverse_campverse_dev
```

## 📊 Performance Testing

### Load Testing
```bash
# Install Apache Bench
brew install httpd

# Test API performance
ab -n 1000 -c 10 http://localhost:5001/health
```

### Database Performance
```bash
# MongoDB performance
docker exec -it campverse_mongo_1 mongosh --eval "db.stats()"

# Redis performance
docker exec -it campverse_redis_1 redis-cli info
```

## 🚀 Production Deployment

### Build Production Image
```bash
docker build -f Backend/Dockerfile -t campverse-backend:latest ./Backend
```

### Run Production
```bash
docker-compose up -d
```

## 📝 Notes

- All sensitive data is masked in production logs
- Rate limiting is enabled on all sensitive endpoints
- Database indexes are optimized for performance
- Automatic cleanup runs every hour
- Health checks monitor service status

## 🎯 Success Criteria

✅ All APIs return proper responses  
✅ Rate limiting works correctly  
✅ Database connections are stable  
✅ Error handling is robust  
✅ Security measures are in place  
✅ Performance is acceptable  
✅ Logs are properly formatted  
✅ Health checks pass  
✅ Cleanup tasks run successfully 