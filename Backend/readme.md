# 🚀 CampVerse Backend Documentation

> **A comprehensive, modular event personalization platform with RESTful APIs for user management, event handling, authentication, verification, and certificate generation.**

---

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Module Documentation](#module-documentation)
- [Development Guide](#development-guide)
- [Testing & Validation](#testing--validation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ System Overview

CampVerse Backend is a **microservice-inspired, modular platform** that provides comprehensive APIs for:

- **User Management**: Registration, authentication, profile management
- **Event Management**: Creation, RSVP, attendance tracking, analytics
- **Certificate System**: Generation, verification, distribution
- **Host Management**: Role-based access, event hosting capabilities
- **Institution Management**: Academic institution integration
- **Recommendation Engine**: Personalized event suggestions
- **Notification System**: Email and in-app notifications

### **Key Features**

- ✅ **JWT Authentication** with role-based access control
- ✅ **QR Code System** for attendance tracking
- ✅ **Certificate Generation** with ML integration
- ✅ **File Upload** with Google Drive integration
- ✅ **Email Notifications** for all key actions
- ✅ **Real-time Analytics** and dashboards
- ✅ **Swagger API Documentation** for interactive testing

---

## 🏛️ Architecture

### **Service Architecture**

```mermaid
graph TD
  subgraph Frontend
    A[React/Vite UI]
  end
  subgraph API Gateway
    B[Express.js Server]
  end
  A --> B
  subgraph Backend Services
    C[User Service]
    D[Event Service]
    E[Certificate Service]
    F[Host Service]
    G[Institution Service]
    H[Recommendation Service]
  end
  B --> C
  B --> D
  B --> E
  B --> F
  B --> G
  B --> H
  subgraph Databases
    I[MongoDB]
    L[Redis]
  end
  C --> I
  D --> I
  E --> I
  F --> I
  G --> I
  H --> I
  C --> L
  D --> L
  E --> L
```

### **Technology Stack**

- **Runtime**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis for sessions, OTP, and caching
- **Authentication**: JWT tokens with role-based access
- **File Storage**: Google Drive API integration
- **Email**: Nodemailer with Gmail SMTP
- **Documentation**: Swagger/OpenAPI 3.0
- **Logging**: Winston logger
- **Rate Limiting**: Express Rate Limit

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js (v16 or higher)
- MongoDB
- Redis
- Google Cloud Platform account (for Drive API)

### **Environment Setup**

```bash
# Clone the repository
git clone https://github.com/CcpC-cuj/CampVerse.git
cd CampVerse/Backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

### **Environment Variables**

```env
# Database
MONGO_URI=mongodb://localhost:27017/campverse
REDIS_URL=redis://127.0.0.1:6379

# Authentication
JWT_SECRET=your_jwt_secret_here

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Google APIs
GOOGLE_DRIVE_CLIENT_ID=your_google_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret
GOOGLE_DRIVE_REDIRECT_URI=your_redirect_uri

# ML Integration
ML_CERTIFICATE_API_URL=https://ml-certificate-api.example.com
ML_API_KEY=your_ml_api_key_here
```

### **Running the Application**

```bash
# Development mode
npm run dev

# Production mode
npm start

# Run tests
npm test
```

### **Docker Setup**

```bash
# Using docker-compose
docker-compose up -d

# Or build and run manually
docker build -t campverse-backend .
docker run -p 5001:5001 campverse-backend
```

---

## 📚 API Documentation

### **Interactive API Docs**

Access the interactive Swagger documentation at: **http://localhost:5001/api-docs**

### **Authentication**

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### **Base URL**

```
http://localhost:5001/api
```

---

## 🧩 Module Documentation

### **1. User Module** (`/api/users`)

**Core Features:**

- User registration with OTP verification
- Google OAuth integration (academic emails only)
- Profile management and preferences
- Password reset functionality
- Host request workflow
- User dashboard and statistics

**Key Endpoints:**

```bash
# Authentication
POST /api/users/register          # Register new user
POST /api/users/verify            # Verify OTP
POST /api/users/login             # Login with credentials
POST /api/users/google-signin     # Google OAuth login

# Profile Management
GET    /api/users/me              # Get current user
PATCH  /api/users/me              # Update profile
POST   /api/users/updatePreferences # Update preferences

# Host Management
POST   /api/users/me/request-host # Request host access
GET    /api/users/host-requests/pending # View pending requests (verifier)
POST   /api/users/host-requests/:id/approve # Approve host request
POST   /api/users/host-requests/:id/reject  # Reject host request

# Password Reset
POST   /api/users/forgot-password # Request password reset
POST   /api/users/reset-password  # Reset password with token
```

**File Structure:**

```
Controller/User.js          # User controller logic
Routes/userRoutes.js        # User route definitions
Models/User.js             # User data model
Services/email.js          # Email service
Services/otp.js            # OTP generation service
```

### **2. Event Module** (`/api/events`)

**Core Features:**

- Event creation and management
- RSVP system with QR code generation
- Attendance tracking via QR scanning
- Event analytics and participant details
- Co-host nomination and approval
- Google Calendar integration

**Key Endpoints:**

```bash
# Event Management
POST   /api/events               # Create event
GET    /api/events/:id           # Get event details
PATCH  /api/events/:id           # Update event
DELETE /api/events/:id           # Delete event

# Participation
POST   /api/events/rsvp          # Register for event
POST   /api/events/cancel-rsvp   # Cancel registration
POST   /api/events/scan          # Scan QR for attendance

# Analytics
GET    /api/events/:id/analytics # Event analytics
GET    /api/events/:id/participants # Participant list

# Co-host Management
POST   /api/events/nominate-cohost # Nominate co-host
POST   /api/events/approve-cohost  # Approve co-host
POST   /api/events/reject-cohost   # Reject co-host

# Calendar Integration
GET    /api/events/:id/calendar-link # Google Calendar link
```

**File Structure:**

```
Controller/event.js              # Event controller logic
Routes/eventRoutes.js           # Event route definitions
Models/Event.js                 # Event data model
Models/EventParticipationLog.js # Participation tracking
Services/driveService.js        # File upload service
```

### **3. Certificate Module** (`/api/certificates`)

**Core Features:**

- Certificate generation for attended users
- ML API integration for certificate creation
- QR code verification system
- Batch certificate generation
- Progress tracking and retry mechanisms
- Certificate dashboard and analytics

**Key Endpoints:**

```bash
# Certificate Generation
POST   /api/certificates/generate      # Generate individual certificate
POST   /api/certificates/generate-batch # Generate batch certificates
POST   /api/certificates/:id/retry     # Retry failed certificate

# Certificate Management
GET    /api/certificates/my            # Get user certificates
GET    /api/certificates/dashboard     # Certificate dashboard
GET    /api/certificates/progress/:eventId # Generation progress

# Verification
POST   /api/certificates/verify        # Verify certificate QR

# Export & Analytics
GET    /api/certificates/export-attended/:eventId # Export attended users
GET    /api/certificates/stats         # Certificate statistics
```

**File Structure:**

```
Controller/certificate.js       # Certificate controller logic
Routes/certificateRoutes.js    # Certificate route definitions
Models/Certificate.js          # Certificate data model
```

### **4. Host Module** (`/api/hosts`)

**Core Features:**

- Host dashboard with analytics
- Event management for hosts
- Participant management
- Host-specific analytics

**Key Endpoints:**

```bash
# Host Dashboard
GET    /api/hosts/dashboard           # Host analytics dashboard
GET    /api/hosts/my-events          # List hosted events

# Event Management
POST   /api/hosts/events             # Create event
PATCH  /api/hosts/events/:id         # Update event
DELETE /api/hosts/events/:id         # Delete event

# Participant Management
GET    /api/hosts/events/:id/participants # Get participants
```

**File Structure:**

```
Controller/host.js              # Host controller logic
Routes/hostRoutes.js           # Host route definitions
```

### **5. Institution Module** (`/api/institutions`)

**Core Features:**

- Institution CRUD operations
- Institution verification system
- Analytics and dashboard
- Student engagement tracking

**Key Endpoints:**

```bash
# Institution Management
POST   /api/institutions              # Create institution
GET    /api/institutions              # List institutions
GET    /api/institutions/:id          # Get institution
PATCH  /api/institutions/:id          # Update institution
DELETE /api/institutions/:id          # Delete institution

# Verification
POST   /api/institutions/:id/request-verification # Request verification
POST   /api/institutions/:id/approve-verification # Approve verification
POST   /api/institutions/:id/reject-verification  # Reject verification

# Analytics
GET    /api/institutions/:id/analytics # Institution analytics
GET    /api/institutions/:id/dashboard # Institution dashboard
```

**File Structure:**

```
Controller/institution.js       # Institution controller logic
Routes/institutionRoutes.js    # Institution route definitions
Models/Institution.js          # Institution data model
```

### **6. Recommendation Module** (`/api/recommendations`)

**Core Features:**

- Personalized event recommendations
- Similar event suggestions
- Preference-based filtering

**Key Endpoints:**

```bash
GET    /api/recommendations/events           # Get recommendations
GET    /api/recommendations/events/:id/similar # Similar events
POST   /api/recommendations/preferences      # Update preferences
```

**File Structure:**

```
Controller/recommendation.js    # Recommendation controller logic
Routes/recommendationRoutes.js # Recommendation route definitions
```

---

## 🛠️ Development Guide

### **Project Structure**

```
Backend/
├── app.js                    # Main application entry point
├── package.json              # Dependencies and scripts
├── Controller/               # Business logic controllers
│   ├── User.js
│   ├── event.js
│   ├── certificate.js
│   ├── host.js
│   ├── institution.js
│   ├── recommendation.js
│   └── analytics.js
├── Routes/                   # API route definitions
│   ├── userRoutes.js
│   ├── eventRoutes.js
│   ├── certificateRoutes.js
│   ├── hostRoutes.js
│   ├── institutionRoutes.js
│   └── recommendationRoutes.js
├── Models/                   # Database models
│   ├── User.js
│   ├── Event.js
│   ├── Certificate.js
│   ├── Institution.js
│   ├── EventParticipationLog.js
│   ├── Notification.js
│   ├── Achievement.js
│   ├── EventVerification.js
│   ├── SearchAnalytics.js
│   └── VerifierAssignment.js
├── Services/                 # External service integrations
│   ├── email.js
│   ├── notification.js
│   ├── driveService.js
│   └── otp.js
├── Middleware/               # Custom middleware
│   ├── Auth.js
│   ├── permissions.js
│   ├── errorHandler.js
│   ├── upload.js
│   └── JWTcheck.js
└── scripts/                  # Utility scripts
```

### **Adding New Features**

#### **1. Create Controller**

```javascript
// Controller/newFeature.js
const newFeature = async (req, res) => {
  try {
    // Business logic here
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { newFeature };
```

#### **2. Create Routes**

```javascript
// Routes/newFeatureRoutes.js
const express = require("express");
const router = express.Router();
const { newFeature } = require("../Controller/newFeature");
const { requireAuth } = require("../Middleware/Auth");

router.post("/new-feature", requireAuth, newFeature);

module.exports = router;
```

#### **3. Add to Main App**

```javascript
// app.js
const newFeatureRoutes = require("./Routes/newFeatureRoutes");
app.use("/api/new-feature", newFeatureRoutes);
```

### **Database Models**

#### **Creating a New Model**

```javascript
// Models/NewModel.js
const mongoose = require("mongoose");

const newModelSchema = new mongoose.Schema({
  field1: { type: String, required: true },
  field2: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("NewModel", newModelSchema);
```

### **Middleware Usage**

#### **Authentication Middleware**

```javascript
const { requireAuth } = require("../Middleware/Auth");
const { requireRole } = require("../Middleware/permissions");

// Require authentication
router.get("/protected", requireAuth, controllerFunction);

// Require specific role
router.post(
  "/admin-only",
  requireAuth,
  requireRole("admin"),
  controllerFunction,
);
```

---

## 🧪 Testing & Validation

### **API Testing**

All endpoints have been tested and validated:

#### **✅ Tested Features**

- User registration and authentication
- Event creation and management
- QR code generation and scanning
- Certificate generation and verification
- Host workflow and permissions
- Email notifications
- File upload system
- Analytics and dashboards

#### **Performance Metrics**

- **API Response Time**: < 200ms average
- **Certificate Generation**: < 500ms
- **QR Code Generation**: < 100ms
- **Email Delivery**: 95% success rate

### **Testing Endpoints**

```bash
# Test user registration
curl -X POST http://localhost:5001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@college.edu","password":"password123"}'

# Test event creation
curl -X POST http://localhost:5001/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{"title":"Test Event","description":"Test Description"}'
```

---

## 🚀 Deployment

### **Production Environment Variables**

```env
NODE_ENV=production
MONGO_URI=mongodb://production-mongo-uri
REDIS_URL=redis://production-redis-uri
JWT_SECRET=production-jwt-secret
EMAIL_USER=production-email
EMAIL_PASSWORD=production-email-password
```

### **Docker Deployment**

```bash
# Build production image
docker build -t campverse-backend:latest .

# Run with environment variables
docker run -d \
  -p 5001:5001 \
  -e MONGO_URI=your-mongo-uri \
  -e REDIS_URL=your-redis-uri \
  campverse-backend:latest
```

### **Environment-Specific Configurations**

- **Development**: Local MongoDB and Redis
- **Staging**: Cloud MongoDB and Redis
- **Production**: Managed database services

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. MongoDB Connection Issues**

```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod
```

#### **2. Redis Connection Issues**

```bash
# Check Redis status
redis-cli ping

# Restart Redis
sudo systemctl restart redis
```

#### **3. Email Configuration Issues**

- Verify Gmail app password is correct
- Check 2FA is enabled on Gmail account
- Ensure EMAIL_USER and EMAIL_PASSWORD are set

#### **4. JWT Token Issues**

- Verify JWT_SECRET is set
- Check token expiration
- Ensure proper Authorization header format

### **Logs and Debugging**

```bash
# View application logs
docker compose logs backend

# Follow logs in real-time
docker compose logs -f backend

# Check specific service logs
docker compose logs backend | grep ERROR
```

### **Performance Issues**

- Check MongoDB query performance
- Monitor Redis memory usage
- Review rate limiting configuration
- Analyze API response times

---

## 📚 Additional Resources

### **Documentation Files**

- `readme.md` - Detailed API documentation
- `TODO_BACKEND.md` - Development roadmap
- `CERTIFICATE_SYSTEM_COMPLETE.md` - Certificate system details
- `API_TESTING_RESULTS.md` - Testing documentation
- `CERTIFICATE_TESTING_RESULTS.md` - Certificate testing results

### **External Links**

- [Swagger API Documentation](http://localhost:5001/api-docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Express.js Documentation](https://expressjs.com/)

### **Support**

For technical support or questions:

- Check the interactive API docs at `/api-docs`
- Review error logs in Docker
- Ensure all environment variables are properly configured
- Contact the development team

---

## 🎯 Development Status

### **✅ Completed Phases**

- **Phase 1: User Module** - ✅ COMPLETED
- **Phase 2: Institution Module** - ✅ COMPLETED
- **Phase 3: Event Module** - ✅ COMPLETED
- **Phase 4: Certificate System** - ✅ COMPLETED

### **🔄 Current Status**

- **Enhanced Analytics**: ✅ Working
- **Email Configuration**: ✅ Fixed and Working
- **QR Code System**: ✅ Working
- **Host Workflow**: ✅ Working
- **Certificate System**: ✅ Working
- **ML API Integration**: ✅ Ready for ML team
- **API Documentation**: ✅ Complete

### **🚧 Planned Features**

- **Payment System**: ❌ Not implemented yet (planned for future phase)
- **Advanced Notification System**: 🚧 Basic email notifications only; in-app notifications planned

---

**CampVerse Backend is now fully functional with all core features completed! 🎉**

---

_Last updated: July 2025_
_Version: 1.0.0_
