# CampVerse Backend TODO

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
- [x] Automated tests and Swagger docs for user endpoints

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
- [x] API documentation and tests for all host-related endpoints

**Host Role/Workflow Status: ✅ COMPLETED - All host-related features implemented with notifications, dashboard, event management, and comprehensive API documentation.**

---

## 🟡 **Phase 2: Institution Module - ✅ COMPLETED**
- [x] Institution CRUD operations (Controller/Routes)
- [x] Auto-detection from email domains during user registration
- [x] Temporary institution creation logic
- [x] Institution verification request system (students can request verification)
- [x] Institution statistics API (student/event counts, engagement)
- [x] Verification status management (PlatformAdmin only)
- [x] API documentation and tests for institution endpoints

**Phase 2 Status: ✅ COMPLETED - All institution module features implemented, tested, and documented.**

---

## 🟠 **Phase 3: Event Module (Next Steps)**
- [ ] Event RSVP/registration endpoint (user registers for event, creates EventParticipationLog)
- [ ] Generate unique QR code ticket on registration (encode event ID, user ID, secure token)
- [ ] Endpoint for user to download/view QR ticket
- [ ] Endpoint for host to scan/validate QR code and mark attendance
- [ ] Event participation status updates (registered, attended, waitlisted, etc.)
- [ ] Email notification on successful RSVP (with event details and QR ticket attached)
- [ ] Google Calendar integration (generate add-to-calendar link or use API for direct add)
- [ ] Event analytics endpoint (registrations, attendance, no-shows, participant list)
- [ ] **Co-host nomination endpoint (main host nominates co-hosts for event)**
- [ ] **Co-host approval/rejection endpoint (verifier approves co-hosts)**
- [ ] **Update Event model: add coHosts (array of userIds), coHostRequests (pending nominations)**
- [ ] **Restrict co-hosts to users with host role only**
- [ ] **Host uploads event logo and banner images**
- [ ] **Images are saved to drive (Google Drive or similar)**
- [ ] **Store and return logoURL and bannerURL for rendering in frontend**
- [ ] API documentation and tests for all new endpoints

## 🟧 **Host Module (Enhancements)**
- [ ] Host dashboard: show analytics for each event (registrations, attendance, etc.)
- [ ] Host can view/download participant list for their events (name, email, phone, payment type/status, attendance)
- [ ] Host-facing QR scanner UI (for event entry validation)
- [ ] **Host can see payment type/status for each participant**
- [ ] **Host can only generate certificates for users marked as attended (QR scanned)**
- [ ] API documentation and tests for analytics endpoints

## 🟡 **Institution Module (Enhancements)**
- [ ] Institution analytics: aggregate event stats, student engagement, event breakdowns
- [ ] Institution dashboard: show analytics and engagement data
- [ ] API documentation and tests for analytics endpoints

## 🟣 **Certificate System**
- [ ] **Certificate generation logic: only for users with status 'attended' (QR scanned)**
- [ ] **Export only attended users for ML certificate generation**
- [ ] API documentation and tests for certificate endpoints

## 🟤 **Notification Module (Enhancements)**
- [ ] Email notification logic for event RSVP/registration (with QR ticket)
- [ ] In-app notification for event registration/RSVP
- [ ] Notification preferences (optional)
- [ ] API documentation and tests for notification endpoints

## 🟢 **Google Calendar Integration**
- [ ] Add-to-calendar link generation for events
- [ ] (Optional) Google Calendar API integration for direct event creation (OAuth2 flow)
- [ ] API documentation and tests for calendar endpoints

---

## 🟣 **Phase 4: Certificate System**
- [ ] Basic certificate generation logic (triggered on event completion)
- [ ] Certificate storage and retrieval endpoints
- [ ] Certificate verification endpoint
- [ ] Certificate templates (basic)
- [ ] API documentation and tests for certificate endpoints

---

## 🟤 **Phase 5: Notification System**
- [ ] Email notification logic (event reminders, role assignments, etc.)
- [ ] In-app notification endpoints
- [ ] Notification preferences (optional)
- [ ] API documentation and tests for notification endpoints

---

## 💳 **Phase 6: Payment System (Future Implementation)**
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Host bank account verification system
- [ ] Payment processing for paid events
- [ ] Transaction logging and audit trail
- [ ] Refund handling system
- [ ] Payment dispute resolution
- [ ] Tax calculation and reporting
- [ ] Host payout system
- [ ] Payment security and fraud prevention
- [ ] API documentation and tests for payment endpoints

**Note: Currently focusing on FREE EVENTS only. Payment system will be implemented after core features are complete.**

---

## ⚫ **Phase 7: Analytics & Search**
- [ ] Search analytics collection (track user searches)
- [ ] Event/user search endpoints (advanced filtering)
- [ ] Platform insights/statistics endpoints
- [ ] API documentation and tests for analytics endpoints

---

## ⚪ **General Backend Tasks**
- [ ] Comprehensive error handling and input validation across all modules
- [ ] Automated tests for all new endpoints
- [ ] Swagger/OpenAPI documentation for all backend APIs
- [ ] Code cleanup and refactoring as needed

---

## ⚙️ **Model Changes**
- [ ] **EventParticipationLog: add paymentType, paymentStatus, attendanceTimestamp, qrToken**
- [ ] **Event: add coHosts (array), coHostRequests (array with status, requestedBy, requestedAt, etc.)**
- [ ] **User: (optional) add coHostedEvents if tracking is needed**

---

*Update this file as tasks are completed or new requirements are added.* 