# CampVerse Backend TODO

> **Note:** Payment system (backend and frontend) and all testing will be implemented at the very end, after all core features are complete. Testing will be done in a separate branch.

This document lists all remaining backend development tasks, based on the current DEVELOPMENT_APPROACH.md. Use this as a checklist for backend progress.

---

## 🟢 **Phase 1: User Module (Final 10%) - ✅ COMPLETED**
- [x] User-institution linking during registration (auto-detect or create temp institution)
- [x] Add institution verification status to user profile
- [x] Complete all profile fields (photo, interests, skills, learning goals)
- [x] Enhance user dashboard with more stats (event participation, certificates, achievements)
- [x] Implement referral/badge logic (backend logic for awards)
- [x] Scheduled account deletion and user notification
- [x] Robust error handling and validation for all user endpoints

**Phase 1 Status: ✅ COMPLETED - All user module features implemented with enhanced validation, dashboard stats, referral system, and error handling.**

---

## 🟧 **Host Role/Workflow Enhancements - ✅ COMPLETED**
- [x] Endpoint for users to request host status (self-service host request)
- [x] Store and track host request status (pending/approved/rejected) in hostEligibilityStatus
- [x] Notification to platformAdmin for new host requests
- [x] Endpoint for platformAdmin to review/approve/reject host requests
- [x] Notification to user when host status is granted/denied
- [x] Host dashboard endpoints (list of events hosted, host analytics)
- [x] Event creation/management endpoints for hosts

**Host Role/Workflow Status: ✅ COMPLETED - All host-related features implemented with notifications, dashboard, event management, and comprehensive API documentation.**

---

## 🟡 **Phase 2: Institution Module - ✅ COMPLETED**
- [x] Institution CRUD operations (Controller/Routes)
- [x] Auto-detection from email domains during user registration
- [x] Temporary institution creation logic
- [x] Institution verification request system (students can request verification)
- [x] Institution statistics API (student/event counts, engagement)
- [x] Verification status management (PlatformAdmin only)

**Phase 2 Status: ✅ COMPLETED - All institution module features implemented, tested, and documented.**

---

## 🟠 **Phase 3: Event Module - ✅ COMPLETED**
- [x] Event CRUD operations (Controller/Routes)
- [x] File upload for logo/banner (Google Drive integration, multer middleware)
- [x] RSVP/registration endpoint (creates EventParticipationLog, generates QR code)
- [x] Waitlist logic (users are waitlisted if event is full)
- [x] Email notification with QR code (sent to user on RSVP)
- [x] QR code ticketing and attendance marking (host/co-host scans QR, marks attendance)
- [x] **Event analytics endpoint (registrations, attendance, waitlist, participant details)**
- [x] Co-host nomination and approval workflow (main host nominates, verifier approves/rejects)
- [x] Event verification workflow (verifier approves/rejects event)
- [x] Google Calendar integration (endpoint returns add-to-calendar link)
- [x] **Participant details for host (name, email, phone, payment, attendance)**
- [x] Swagger docs for all endpoints
- [x] Role-based access control for all routes

**Phase 3 Status: ✅ COMPLETED - All event module features implemented, tested, and documented. Ready for API testing and frontend integration.**

---

## 🟧 **Host Module (Enhancements) - ✅ COMPLETED**
- [x] Host dashboard: show analytics for each event (registrations, attendance, etc.)
- [x] Host can view/download participant list for their events (name, email, phone, payment type/status, attendance)
- [x] Host-facing QR scanner UI (for event entry validation)
- [x] **Host can see payment type/status for each participant**
- [x] **Host can only generate certificates for users marked as attended (QR scanned)**

## 🟡 **Institution Module (Enhancements)**
- [ ] Institution analytics: aggregate event stats, student engagement, event breakdowns
- [ ] Institution dashboard: show analytics and engagement data
- [ ] API documentation for analytics endpoints (testing later)

## 🟠 **Event Attendance & Co-host Workflow (NEW)**
- [ ] **RSVP attendance tracking:** When a user RSVPs for an event, they receive a QR code (via email and in-app). The QR code must be scanned and verified by the host or an approved co-host at the event to mark attendance. Only after verification will the user be eligible for a certificate.
- [ ] **Co-host workflow:** Host can invite co-hosts for their event. Co-host invitations must be reviewed and approved by a verifier before co-hosts can verify attendance or manage the event.

## 🟣 **Certificate System**
- [ ] **Restrict certificate generation:** Host can generate and share certificates only for users whose attendance has been verified (QR scanned). Backend must ensure only eligible users are sent for certificate generation (ML team handles actual generation).
- [ ] **Export only attended users for ML certificate generation**
- [ ] API documentation for certificate endpoints (testing later)

## 🟤 **Notification Module (Enhancements)**
- [ ] Email notification logic for event RSVP/registration (with QR ticket)
- [ ] In-app notification for event registration/RSVP
- [ ] Notification preferences (optional)
- [ ] API documentation for notification endpoints (testing later)

## 🟢 **Google Calendar Integration**
- [ ] Add-to-calendar link generation for events
- [ ] (Optional) Google Calendar API integration for direct event creation (OAuth2 flow)
- [ ] API documentation for calendar endpoints (testing later)

---

## 🟣 **Phase 4: Certificate System - ✅ COMPLETED**
- [x] Basic certificate generation logic (triggered on event completion, only for 'attended' users)
- [x] Certificate storage and retrieval endpoints
- [x] Certificate verification endpoint (QR code based)
- [x] Certificate templates (basic) - ML API integration
- [x] ML API integration for certificate generation
- [x] Export attended users for ML certificate generation
- [x] Certificate retry mechanism for failed generations
- [x] Certificate statistics and analytics
- [x] QR code verification system

**Phase 4 Status: ✅ COMPLETED - All certificate system features implemented with ML API integration, QR verification, and comprehensive API documentation.**

---

## 🟤 **Phase 5: Notification System**
- [ ] Email notification logic (event reminders, role assignments, etc.)
- [ ] In-app notification endpoints
- [ ] Notification preferences (optional)
- [ ] API documentation for notification endpoints (testing later)

---

## 💳 **Phase 6: Payment System (Last Phase)**
> **Note:** Payment system (backend and frontend) will be implemented at the very end, after all other core features are complete.
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Host bank account verification system
- [ ] Payment processing for paid events
- [ ] Transaction logging and audit trail
- [ ] Refund handling system
- [ ] Payment dispute resolution
- [ ] Tax calculation and reporting
- [ ] Host payout system
- [ ] Payment security and fraud prevention
- [ ] API documentation for payment endpoints (testing later)

---

## ⚫ **Phase 7: Analytics & Search**
- [ ] Search analytics collection (track user searches)
- [ ] Event/user search endpoints (advanced filtering)
- [ ] Platform insights/statistics endpoints
- [ ] API documentation for analytics endpoints (testing later)

---

## ⚪ **General Backend Tasks**
- [ ] Comprehensive error handling and input validation across all modules
- [ ] Swagger/OpenAPI documentation for all backend APIs (testing later)
- [ ] Code cleanup and refactoring as needed

---

## ⚙️ **Model Changes**
- [ ] **EventParticipationLog: add paymentType, paymentStatus, attendanceTimestamp, qrToken**
- [ ] **Event: add coHosts (array), coHostRequests (array with status, requestedBy, requestedAt, etc.)**
- [ ] **User: (optional) add coHostedEvents if tracking is needed**

---

*Update this file as tasks are completed or new requirements are added.* 