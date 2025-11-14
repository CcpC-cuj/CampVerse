# Host Module - Complete Implementation Guide

## Overview
This document outlines the complete host workflow implementation for CampVerse, including QR-based attendance tracking and automated certificate generation.

---

## 1. QR Code Attendance System

### Flow:
1. **User Registration** → User registers for an event
2. **QR Generation** → System generates unique QR code for the user
3. **QR Scanning** → Host/co-host scans QR at event venue
4. **Attendance Marking** → System marks attendance and invalidates QR
5. **Certificate Eligibility** → Attended users become eligible for certificates

### Backend Implementation

#### QR Code Structure (EventParticipationLog Model)
```javascript
qrCode: {
  token: String,           // Unique token
  imageUrl: String,        // Cloud storage URL
  generatedAt: Date,
  expiresAt: Date,        // Event end + 2 hours
  isUsed: Boolean,
  usedAt: Date,
  usedBy: ObjectId        // Host who scanned
}
```

#### API Endpoints

**1. Get User's QR Code**
```
GET /api/events/my-qr/:eventId
Headers: Authorization: Bearer {token}

Response:
{
  "qrToken": "unique-token-here",
  "qrImageUrl": "https://...",
  "expiresAt": "2025-11-14T18:00:00Z",
  "status": "registered"
}
```

**2. Scan QR Code (Host/Co-host only)**
```
POST /api/hosts/scan-qr
Headers: Authorization: Bearer {token}
Body:
{
  "eventId": "event-id",
  "qrToken": "scanned-token"
}

Response:
{
  "success": true,
  "message": "Attendance marked successfully",
  "participantName": "John Doe"
}
```

### Frontend Implementation

#### QRScanner Component
Location: `Frontend/src/hostdashboard/QRScanner.jsx`

Features:
- Uses `html5-qrcode` library for scanning
- Camera access for real-time QR scanning
- Validates QR codes with backend
- Shows scan success/error feedback
- Rate-limited to prevent abuse

---

## 2. Certificate Generation System

### Architecture

```
┌─────────────────┐
│  Host Dashboard │
└────────┬────────┘
         │
         ├──► Enable Certificates
         ├──► Configure Settings
         ├──► Upload Assets
         │     ├─ Template
         │     ├─ Logos
         │     └─ Signatures
         │
         ├──► Generate Certificates
         │     (For attended participants)
         │
         └──► Download/Distribute
```

### Backend Components

#### 1. Certificate Management Controller
Location: `Backend/Controller/certificateManagement.js`

**Functions:**
- `updateCertificateSettings()` - Enable/configure certificates
- `uploadCertificateAssets()` - Upload template, logos, signatures
- `generateCertificates()` - Generate PDFs for attended users
- `getCertificateStatus()` - Check generation status
- `getUserCertificate()` - Get user's certificate
- `regenerateCertificates()` - Regenerate all certificates
- `bulkUploadParticipants()` - CSV upload for participant data

#### 2. Event Model Updates
Location: `Backend/Models/Event.js`

Added fields:
```javascript
features: {
  certificateEnabled: Boolean,
  chatEnabled: Boolean
},
certificateSettings: {
  certificateType: String,      // 'participation' | 'achievement'
  awardText: String,
  leftSignatory: {
    name: String,
    title: String
  },
  rightSignatory: {
    name: String,
    title: String
  },
  uploadedAssets: [...]
}
```

#### 3. Certificate Routes
Location: `Backend/Routes/certificateManagementRoutes.js`

**Endpoints:**
- `PATCH /api/certificate-management/events/:eventId/settings`
- `POST /api/certificate-management/events/:eventId/upload-assets`
- `POST /api/certificate-management/events/:eventId/generate`
- `GET /api/certificate-management/events/:eventId/status`
- `GET /api/certificate-management/events/:eventId/my-certificate`
- `POST /api/certificate-management/events/:eventId/regenerate`
- `POST /api/certificate-management/events/:eventId/bulk-upload`

### Frontend Components

#### CertificateManagement Component
Location: `Frontend/src/hostdashboard/CertificateManagement.jsx`

**Features:**
1. **Settings Panel**
   - Toggle certificate generation
   - Select certificate type
   - Configure award text
   - Set signatory details

2. **Asset Upload Panel**
   - Upload certificate template
   - Upload left/right logos
   - Upload left/right signatures
   - Upload custom fonts (optional)

3. **Status Dashboard**
   - Total attended participants
   - Certificates generated count
   - Pending certificates
   - Participant-wise status table

4. **Actions**
   - Generate certificates (batch)
   - Regenerate all certificates
   - Download individual certificates

---

## 3. Certificate Generator API Integration

### ML Service
Location: `ML/certificate_generator/api_main.py`

**Base URL:** `http://localhost:8000` (configurable via env)

### Workflow

1. **Upload Template**
```bash
POST /upload-template
Content-Type: multipart/form-data
- file: template.png
- template_type: 'participation' | 'achievement'
```

2. **Upload Logos**
```bash
POST /upload-logo
- file: logo.png
- logo_type: 'left' | 'right'
```

3. **Upload Signatures**
```bash
POST /upload-signature
- file: signature.png
- signature_type: 'left' | 'right'
```

4. **Configure Settings**
```bash
POST /config/award-text
{
  "text": "For outstanding participation...",
  "position": {"x": 810, "y": 720},
  "font_size": 45,
  "max_width": 1000
}

POST /config/signatory-left
{
  "filename": "signature_left.png",
  "name": "Dr. John Doe",
  "title": "Director",
  "image_position": {"x": 400, "y": 1100},
  "text_position": {"x": 400, "y": 1200}
}
```

5. **Generate Certificates**
```bash
POST /generate
{
  "names": ["John Doe", "Jane Smith", "Om Vishesh"]
}

Response:
{
  "message": "Successfully generated 3 certificate(s)",
  "files": ["John_Doe_20251114_143022.pdf", ...],
  "download_urls": ["/download/John_Doe_20251114_143022.pdf", ...]
}
```

6. **Download Certificate**
```bash
GET /download/{filename}
Returns: PDF file
```

---

## 4. Complete Host Workflow

### Step-by-Step Process

#### A. Event Creation
1. Host creates event via `CreateEventForm`
2. Can enable certificate generation during creation
3. Event saved with `features.certificateEnabled = true`

#### B. Pre-Event Setup
1. Navigate to Certificate Management
2. Configure certificate settings:
   - Certificate type (participation/achievement)
   - Award text
   - Signatory details
3. Upload required assets:
   - Certificate template (PNG/JPG, recommended 2000x1500px)
   - Left logo (PNG with transparency)
   - Right logo (PNG with transparency)
   - Left signature (PNG, 300x150px)
   - Right signature (PNG, 300x150px)

#### C. During Event - Attendance
1. Participants show their QR codes (from mobile app)
2. Host/co-host opens QR Scanner
3. Scan each participant's QR code
4. System validates and marks attendance
5. QR code is invalidated after use
6. Participant receives attendance notification

#### D. Post-Event - Certificate Generation
1. Host opens Certificate Management
2. Views attendance statistics
3. Clicks "Generate Certificates"
4. System:
   - Fetches all attended participants
   - Calls certificate generator API
   - Creates PDFs for each participant
   - Saves certificate records in database
   - Sends download links
5. Host can:
   - Preview certificates
   - Download individual certificates
   - Regenerate if needed
6. Participants can download their certificates from their dashboard

---

## 5. Database Schema

### EventParticipationLog
```javascript
{
  userId: ObjectId,
  eventId: ObjectId,
  status: 'registered' | 'waitlisted' | 'attended',
  qrCode: {
    token: String,
    imageUrl: String,
    generatedAt: Date,
    expiresAt: Date,
    isUsed: Boolean,
    usedAt: Date,
    usedBy: ObjectId
  },
  attendanceTimestamp: Date,
  attendanceMarkedBy: ObjectId,
  attendanceMarkedAt: Date
}
```

### Event
```javascript
{
  hostUserId: ObjectId,
  coHosts: [ObjectId],
  features: {
    certificateEnabled: Boolean,
    chatEnabled: Boolean
  },
  certificateSettings: {
    certificateType: String,
    awardText: String,
    leftSignatory: { name: String, title: String },
    rightSignatory: { name: String, title: String },
    uploadedAssets: [...]
  }
}
```

### Certificate
```javascript
{
  userId: ObjectId,
  eventId: ObjectId,
  certificateUrl: String,
  generatedAt: Date,
  status: 'generated' | 'sent' | 'downloaded',
  qrCode: String  // For certificate verification
}
```

---

## 6. Security Considerations

### QR Scanning
- ✅ Rate limiting (2 seconds between scans)
- ✅ Host/co-host only permission check
- ✅ Token uniqueness validation
- ✅ Expiry validation (event end + 2 hours)
- ✅ Single-use validation
- ✅ Event association check

### Certificate Generation
- ✅ Host-only permission
- ✅ Certificate enablement check
- ✅ Attendance validation (only attended users)
- ✅ File type validation for uploads
- ✅ File size limits
- ✅ Asset existence verification

### API Protection
- ✅ JWT authentication on all endpoints
- ✅ Role-based access control
- ✅ Request validation
- ✅ Error handling with proper status codes
- ✅ CORS configuration

---

## 7. Environment Variables

Required in `.env`:
```bash
# Certificate Generator API
CERTIFICATE_API_URL=http://localhost:8000

# MongoDB
MONGO_URI=mongodb://...

# JWT
JWT_SECRET=your-secret-key

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_DIR=/tmp/uploads
```

---

## 8. Installation & Setup

### Backend Dependencies
```bash
cd Backend
npm install axios form-data multer
```

### Frontend Dependencies
```bash
cd Frontend
npm install @mui/material @emotion/react @emotion/styled
npm install axios
```

### Certificate Generator Setup
```bash
cd ML/certificate_generator
pip install -r requirements.txt
python api_main.py
```

---

## 9. Testing Checklist

### QR Attendance
- [ ] User can view their QR code
- [ ] QR code is unique per user-event pair
- [ ] Host can scan QR code
- [ ] Co-host can scan QR code
- [ ] Non-host cannot scan
- [ ] QR invalidates after use
- [ ] Expired QR shows error
- [ ] Duplicate scan shows error
- [ ] Attendance marked correctly
- [ ] Notification sent to participant

### Certificate Generation
- [ ] Host can enable certificates
- [ ] Host can configure settings
- [ ] Host can upload assets
- [ ] Assets are validated
- [ ] Generate only for attended users
- [ ] Certificates generated successfully
- [ ] Download links work
- [ ] User can view their certificate
- [ ] Regenerate works correctly
- [ ] Status dashboard shows accurate data

---

## 10. API Documentation

Full API documentation available at:
- Backend: `http://localhost:5001/api-docs`
- Certificate Generator: `http://localhost:8000/docs`

---

## 11. Troubleshooting

### Common Issues

**1. Certificate generation fails**
- Check certificate generator service is running
- Verify CERTIFICATE_API_URL is correct
- Ensure all required assets are uploaded
- Check logs for specific error

**2. QR scan not working**
- Verify camera permissions
- Check token validity
- Ensure host/co-host role
- Verify event exists and is active

**3. Assets upload fails**
- Check file size limits
- Verify file format (PNG/JPG)
- Ensure proper authentication
- Check network connectivity

---

## 12. Future Enhancements

- [ ] Batch QR scanning (multiple at once)
- [ ] QR code analytics
- [ ] Certificate templates library
- [ ] Email certificate automation
- [ ] Certificate verification portal
- [ ] Blockchain-based certificate verification
- [ ] Multi-language certificate support
- [ ] Certificate expiry management
- [ ] Bulk certificate email distribution
- [ ] Certificate sharing to social media

---

## 13. File Structure

```
CampVerse/
├── Backend/
│   ├── Controller/
│   │   ├── host.js
│   │   ├── event.js
│   │   └── certificateManagement.js  ✨ NEW
│   ├── Routes/
│   │   ├── hostRoutes.js  (updated)
│   │   ├── eventRoutes.js
│   │   └── certificateManagementRoutes.js  ✨ NEW
│   ├── Models/
│   │   ├── Event.js  (updated)
│   │   ├── EventParticipationLog.js
│   │   └── Certificate.js
│   └── app.js  (updated)
│
├── Frontend/
│   └── src/
│       └── hostdashboard/
│           ├── QRScanner.jsx
│           ├── CertificateManagement.jsx  ✨ NEW
│           └── index.js  (updated)
│
└── ML/
    └── certificate_generator/
        ├── api_main.py
        ├── generator.py
        ├── README.md
        └── requirements.txt
```

---

## 14. Support & Contact

For issues or questions:
- GitHub Issues: [Repository URL]
- Documentation: This file
- API Docs: /api-docs endpoint

---

**Last Updated:** November 14, 2025
**Version:** 1.0.0
**Status:** ✅ Complete Implementation
