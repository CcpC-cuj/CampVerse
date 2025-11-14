# Host Module - QR Attendance & Certificate Generation

Complete implementation of QR-based attendance tracking and automated certificate generation for event hosts.

## 🎯 Features

### 1. QR Code Attendance System
- ✅ Unique QR codes for each participant
- ✅ Real-time QR scanning by hosts/co-hosts
- ✅ Automatic attendance marking
- ✅ QR expiry and single-use validation
- ✅ Instant notifications to participants

### 2. Certificate Generation
- ✅ Enable/disable certificates per event
- ✅ Upload custom certificate templates
- ✅ Configure logos and signatures
- ✅ Set signatory details
- ✅ Batch certificate generation for all attended participants
- ✅ Individual certificate downloads
- ✅ Regeneration capability

### 3. Host Dashboard
- ✅ Certificate settings management
- ✅ Asset upload interface
- ✅ Real-time status tracking
- ✅ Participant-wise certificate status
- ✅ Analytics and reporting

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- Python 3.8+
- MongoDB
- npm/yarn

### Installation

Run the automated setup script:
```bash
cd /Users/macbook-krish/Desktop/CampVerse
./scripts/setup-host-module.sh
```

Or install manually:

```bash
# Backend dependencies
cd Backend
npm install axios form-data

# Frontend dependencies
cd ../Frontend
npm install @mui/material @emotion/react @emotion/styled

# Certificate generator
cd ../ML/certificate_generator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Setup

Add to `Backend/.env`:
```bash
CERTIFICATE_API_URL=http://localhost:8000
```

### Running the Application

**Terminal 1 - Certificate Generator:**
```bash
cd ML/certificate_generator
source venv/bin/activate
python api_main.py
# Runs on http://localhost:8000
```

**Terminal 2 - Backend:**
```bash
cd Backend
npm start
# Runs on http://localhost:5001
```

**Terminal 3 - Frontend:**
```bash
cd Frontend
npm run dev
# Runs on http://localhost:5173
```

## 📖 Usage Guide

### For Event Hosts

#### 1. Enable Certificates for an Event
1. Navigate to your event in Host Dashboard
2. Go to "Certificate Management" tab
3. Toggle "Enable Certificates"
4. Configure settings:
   - Certificate type (Participation/Achievement)
   - Award text
   - Signatory details (left and right)

#### 2. Upload Certificate Assets
1. Click "Upload Files" button
2. Upload required files:
   - **Certificate Template** (PNG/JPG, 2000x1500px recommended)
   - **Left Logo** (PNG with transparency)
   - **Right Logo** (PNG with transparency)
   - **Left Signature** (PNG, 300x150px)
   - **Right Signature** (PNG, 300x150px)

#### 3. Mark Attendance Using QR Scanner
1. Open "QR Scanner" from Host Dashboard
2. Scan participant QR codes using camera
3. System validates and marks attendance
4. Participant receives confirmation notification

#### 4. Generate Certificates
1. After event completion, go to "Certificate Management"
2. View attendance statistics
3. Click "Generate Certificates"
4. System generates PDFs for all attended participants
5. Download or share certificates

### For Participants

#### 1. Get Your QR Code
1. Register for an event
2. Navigate to "My Events"
3. View your unique QR code for the event
4. Present QR code at venue for attendance

#### 2. Download Your Certificate
1. After event completion and certificate generation
2. Go to "My Certificates"
3. Find your event
4. Click "Download Certificate"

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Host Dashboard                        │
│  ┌────────────────┐  ┌──────────────────────────────┐  │
│  │  QR Scanner    │  │  Certificate Management      │  │
│  │                │  │                              │  │
│  │  - Scan QR     │  │  - Settings                  │  │
│  │  - Mark        │  │  - Upload Assets             │  │
│  │    Attendance  │  │  - Generate Certificates     │  │
│  │                │  │  - View Status               │  │
│  └────────┬───────┘  └────────────┬─────────────────┘  │
└───────────┼──────────────────────┼─────────────────────┘
            │                       │
            ▼                       ▼
┌───────────────────────────────────────────────────────┐
│                  Backend APIs                          │
│  /api/hosts/scan-qr                                   │
│  /api/certificate-management/events/:eventId/*        │
└──────────────────┬────────────────────────────────────┘
                   │
                   ▼
┌───────────────────────────────────────────────────────┐
│          Certificate Generator Service                 │
│          (Python FastAPI - Port 8000)                 │
│                                                        │
│  - Template processing                                │
│  - Logo/signature placement                           │
│  - PDF generation                                     │
│  - File storage                                       │
└───────────────────────────────────────────────────────┘
```

## 📁 File Structure

```
CampVerse/
├── Backend/
│   ├── Controller/
│   │   ├── host.js
│   │   ├── event.js
│   │   └── certificateManagement.js          ✨ NEW
│   ├── Routes/
│   │   ├── hostRoutes.js                     📝 UPDATED
│   │   └── certificateManagementRoutes.js    ✨ NEW
│   ├── Models/
│   │   ├── Event.js                          📝 UPDATED
│   │   ├── EventParticipationLog.js
│   │   └── Certificate.js
│   └── app.js                                📝 UPDATED
│
├── Frontend/
│   └── src/
│       └── hostdashboard/
│           ├── QRScanner.jsx                 ✅ EXISTS
│           ├── CertificateManagement.jsx     ✨ NEW
│           └── index.js                      📝 UPDATED
│
├── ML/
│   └── certificate_generator/
│       ├── api_main.py
│       ├── generator.py
│       ├── README.md
│       └── requirements.txt
│
├── docs/
│   └── host-module-complete-guide.md         ✨ NEW
│
└── scripts/
    └── setup-host-module.sh                  ✨ NEW
```

## 🔐 Security

### QR Code Security
- Unique tokens per participant-event pair
- Expiry validation (event end + 2 hours)
- Single-use enforcement
- Rate limiting (2 seconds between scans)
- Host/co-host only permissions

### Certificate Security
- Host-only access to generation
- Attendance validation (only attended users)
- File type validation for uploads
- File size limits enforced
- Secure asset storage

## 🔌 API Endpoints

### QR Attendance
```
POST /api/hosts/scan-qr
Headers: Authorization: Bearer {token}
Body: { eventId, qrToken }
```

### Certificate Management
```
PATCH /api/certificate-management/events/:eventId/settings
POST  /api/certificate-management/events/:eventId/upload-assets
POST  /api/certificate-management/events/:eventId/generate
GET   /api/certificate-management/events/:eventId/status
GET   /api/certificate-management/events/:eventId/my-certificate
POST  /api/certificate-management/events/:eventId/regenerate
```

### Certificate Generator API
```
POST /upload-template
POST /upload-logo
POST /upload-signature
POST /config/award-text
POST /config/signatory-left
POST /config/signatory-right
POST /generate
GET  /download/{filename}
```

## 📊 Database Schema

### Event Model (Extended)
```javascript
{
  features: {
    certificateEnabled: Boolean,
    chatEnabled: Boolean
  },
  certificateSettings: {
    certificateType: 'participation' | 'achievement',
    awardText: String,
    leftSignatory: { name: String, title: String },
    rightSignatory: { name: String, title: String },
    uploadedAssets: [...]
  }
}
```

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
  attendanceMarkedBy: ObjectId
}
```

## 🧪 Testing

### Test QR Attendance
1. Create test event as host
2. Register as test participant
3. Get participant QR code
4. Scan QR as host
5. Verify attendance marked
6. Try scanning again (should fail - already used)

### Test Certificate Generation
1. Mark attendance for test participants
2. Enable certificates for event
3. Upload test assets
4. Configure settings
5. Generate certificates
6. Verify PDFs created
7. Download and check certificate

## 🐛 Troubleshooting

### Certificate Generator Not Starting
```bash
# Check Python version
python3 --version  # Should be 3.8+

# Reinstall dependencies
cd ML/certificate_generator
pip install -r requirements.txt --force-reinstall

# Check port availability
lsof -i :8000
```

### QR Scanner Not Working
- Check camera permissions in browser
- Verify HTTPS or localhost
- Check token validity
- Ensure host/co-host role

### Assets Upload Failing
- Check file size (max 10MB)
- Verify file format (PNG/JPG only)
- Check backend logs for errors
- Verify CERTIFICATE_API_URL is set

## 📚 Documentation

- **Complete Guide:** [docs/host-module-complete-guide.md](../docs/host-module-complete-guide.md)
- **Certificate Generator API:** http://localhost:8000/docs
- **Backend API:** http://localhost:5001/api-docs

## 🤝 Contributing

1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Submit PR with clear description

## 📝 License

[Your License Here]

## 🎉 Credits

Developed as part of CampVerse platform.

---

**Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** November 14, 2025
