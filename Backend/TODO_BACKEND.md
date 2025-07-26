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

## 🟡 **Phase 2: Institution Module**
- [ ] Institution CRUD operations (Controller/Routes)
- [ ] Auto-detection from email domains during user registration
- [ ] Temporary institution creation logic
- [ ] Institution verification request system (students can request verification)
- [ ] Institution statistics API (student/event counts, engagement)
- [ ] Verification status management (PlatformAdmin only)
- [ ] API documentation and tests for institution endpoints

---

## 🟠 **Phase 3: Event Module**
- [ ] Event CRUD operations (Controller/Routes)
- [ ] Event verification workflow (verifier role)
- [ ] Event participation system (register, waitlist, attend)
- [ ] Event search and filtering endpoints
- [ ] Event categories/tags support
- [ ] Participant management (host can view/manage participants)
- [ ] Waitlist system for events
- [ ] API documentation and tests for event endpoints

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

*Update this file as tasks are completed or new requirements are added.* 