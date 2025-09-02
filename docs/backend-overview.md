# Backend Overview (CampVerse)

This document summarizes backend modules, routes, middleware, models, and key logic for CampVerse.

## Entry point

- `Backend/app.js`
  - Initializes services (Redis via `Services/cacheService` and memory manager), sets security headers (Helmet + custom), correlation IDs, sanitization, timeouts, CORS, rate limits.
  - Swagger available at `/api-docs` and `/api-docs.json`.
  - Mounts routes:
    - `/api/users` → `Routes/userRoutes.js`
    - `/api/hosts` → `Routes/hostRoutes.js`
    - `/api/institutions` → `Routes/institutionRoutes.js`
    - `/api/events` → `Routes/eventRoutes.js`
    - `/api/certificates` → `Routes/certificateRoutes.js`
    - `/api/recommendations` → `Routes/recommendationRoutes.js`
    - `/api/feedback` → `Routes/feedbackRoutes.js`
    - `/api/support` → `Routes/supportRoutes.js`
  - Centralized error handler via `Middleware/errorHandler.js`.

## Middleware

- `Middleware/Auth.js`: `authenticateToken`, `requireRole`, `requireSelfOrRole` for RBAC.
- `Middleware/permissions.js`: fine-grained guards (host/co-host, verifier, etc.).
- `Middleware/validation.js`: input sanitization.
- `Middleware/upload.js`: file uploads (multer).
- `Middleware/security.js`: composable security stack (bruteforce, request size, injection/XSS checks) with Redis client.
- `Middleware/timeout.js`: request queueing and timeouts.
- `Middleware/errorHandler.js`: error logging and response normalization.

## Controllers and responsibilities

- `Controller/event.js`: Event CRUD, RSVP/cancel, participants, QR scan attendance, analytics, co-host nomination/approval/rejection, verification, calendar links, advanced analytics and search endpoints.
- `Controller/host.js`: Host dashboard, my events, host-scope event management, participants.
- `Controller/institution.js`: Institution CRUD (admin), search, request-new institution, pending verifications, approve/reject verification, analytics and dashboard.
- `Controller/certificate.js`: Certificate generation, stats, get by id, verification, export attended users, retry, batch, progress, notifications, dashboard, bulk-retry.
- `Controller/analytics.js`: Cross-cutting analytics used by events endpoints.
- `Controller/support.js`: Support ticket submission, my tickets, admin listing and updates, analytics.
- `Controller/feedback.js`: Feedback submission with optional attachment.
- `Controller/User.js`: User auth/profile/notifications (see `Routes/userRoutes.js`).

## Routes (high level)

- `/api/events`:
  - `GET /` list public events; `POST /` create (host), `GET /:id`, `PATCH /:id`, `DELETE /:id`.
  - `POST /rsvp`, `POST /cancel-rsvp`, `GET /:id/participants`, `POST /scan`.
  - `GET /:id/analytics`, `POST /:id/verify`, `GET /:id/calendar-link`.
  - `POST /nominate-cohost`, `POST /approve-cohost`, `POST /reject-cohost`.
  - `GET /search`, `GET /user-analytics/:userId`, `GET /platform-insights`, `GET /search-analytics`.
  - `GET /:id/advanced-analytics`, `GET /user-activity/:userId`, `GET /admin/growth-trends`, `GET /admin/zero-result-searches`.

- `/api/hosts`:
  - `GET /dashboard`, `GET /my-events`, `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`, `GET /events/:id/participants`.

- `/api/institutions`:
  - `GET /search`, `POST /request-new`.
  - Admin/verifier: `GET /pending-verifications`, `POST /:id/approve-verification`, `POST /:id/reject-verification`.
  - Admin: `POST /`, `GET /`, `PATCH /:id`, `DELETE /:id`.
  - Common: `GET /:id`, `GET /:id/analytics`, `GET /:id/dashboard`.

- `/api/certificates`:
  - `POST /generate`, `GET /my`, `GET /user/:userId`, `GET /stats`, `GET /:id`, `POST /verify`.
  - `GET /export-attended/:eventId`, `POST /:certificateId/retry`, `POST /generate-batch`.
  - `GET /progress/:eventId`, `POST /:certificateId/notify`, `GET /dashboard`, `POST /:eventId/bulk-retry`.

- `/api/support`:
  - `POST /tickets`, `GET /tickets/my`, `GET /tickets/:id`.
  - Admin/verifier: `GET /tickets`, `PATCH /tickets/:id`, `GET /analytics`.

- `/api/feedback`:
  - `POST /` (multipart optional attachment).

## Models (Mongoose schemas)

- `Models/User.js`, `Models/Institution.js`, `Models/Event.js`, `Models/EventParticipationLog.js`, `Models/EventVerification.js`, `Models/Certificate.js`, `Models/Notification.js`, `Models/Achievement.js`, `Models/VerifierAssignment.js`, `Models/Feedback.js`, `Models/SupportTicket.js`, `Models/SearchAnalytics.js`.

## Known fixes and notes from this audit

- Frontend API wrappers aligned to backend routes (added `src/api/events.js`, `certificates.js`, `support.js`, completed `host.js`, extended `institution.js`; updated central exports).
- Graceful handling in frontend for removed `institutions/:id/request-verification` with a safe no-op return to avoid crashes.
- No linter errors detected in updated frontend API modules.

## Usage from frontend

- All API wrappers live under `Frontend/src/api` and share base `API_URL` and `getAuthHeaders()` from `user.js`.
- Components should import from `src/api/index.js` to access typed wrappers and reduce direct route string usage.




 Frontend-Backend API Alignment Analysis
After thoroughly analyzing both the frontend and backend codebases, here's a comprehensive comparison of API alignment:
✅ PERFECTLY ALIGNED APIs
User Management APIs - 100% Aligned
Frontend API	Backend Route	Status
register()	POST /api/users/register	✅ Perfect
verifyOtp()	POST /api/users/verify	✅ Perfect
login()	POST /api/users/login	✅ Perfect
googleSignIn()	POST /api/users/google-signin	✅ Perfect
linkGoogleAccount()	POST /api/users/link-google	✅ Perfect
unlinkGoogleAccount()	POST /api/users/unlink-google	✅ Perfect
forgotPassword()	POST /api/users/forgot-password	✅ Perfect
resetPassword()	POST /api/users/reset-password	✅ Perfect
getAuthStatus()	GET /api/users/auth-status	✅ Perfect
setupPassword()	POST /api/users/setup-password	✅ Perfect
changePassword()	POST /api/users/change-password	✅ Perfect
sendVerificationOtp()	POST /api/users/send-verification-otp	✅ Perfect
verifyOtpForGoogleUser()	POST /api/users/verify-otp	✅ Perfect
resendOtp()	POST /api/users/resend-otp	✅ Perfect
getDashboard()	GET /api/users	✅ Perfect
updateMe()	PATCH /api/users/me	✅ Perfect
uploadProfilePhoto()	POST /api/users/me/profile-photo	✅ Perfect
deleteMyAccount()	POST /api/users/me/delete	✅ Perfect
Events APIs - 100% Aligned
Frontend API	Backend Route	Status
listEvents()	GET /api/events	✅ Perfect
createEvent()	POST /api/events	✅ Perfect
getEventById()	GET /api/events/:id	✅ Perfect
updateEvent()	PATCH /api/events/:id	✅ Perfect
deleteEvent()	DELETE /api/events/:id	✅ Perfect
rsvpEvent()	POST /api/events/rsvp	✅ Perfect
cancelRsvp()	POST /api/events/cancel-rsvp	✅ Perfect
getParticipants()	GET /api/events/:id/participants	✅ Perfect
scanQr()	POST /api/events/scan	✅ Perfect
getEventAnalytics()	GET /api/events/:id/analytics	✅ Perfect
nominateCoHost()	POST /api/events/nominate-cohost	✅ Perfect
approveCoHost()	POST /api/events/approve-cohost	✅ Perfect
rejectCoHost()	POST /api/events/reject-cohost	✅ Perfect
verifyEvent()	POST /api/events/:id/verify	✅ Perfect
getGoogleCalendarLink()	GET /api/events/:id/calendar-link	✅ Perfect
advancedEventSearch()	GET /api/events/search	✅ Perfect
getUserAnalytics()	GET /api/events/user-analytics/:userId	✅ Perfect
getPlatformInsights()	GET /api/events/platform-insights	✅ Perfect
getSearchAnalytics()	GET /api/events/search-analytics	✅ Perfect
getAdvancedEventAnalytics()	GET /api/events/:id/advanced-analytics	✅ Perfect
getUserActivityTimeline()	GET /api/events/user-activity/:userId	✅ Perfect
getGrowthTrends()	GET /api/events/admin/growth-trends	✅ Perfect
getZeroResultSearches()	GET /api/events/admin/zero-result-searches	✅ Perfect
Certificates APIs - 100% Aligned
Frontend API	Backend Route	Status
generateCertificate()	POST /api/certificates/generate	✅ Perfect
getMyCertificates()	GET /api/certificates/my	✅ Perfect
getCertificatesForUser()	GET /api/certificates/user/:userId	✅ Perfect
getCertificateStats()	GET /api/certificates/stats	✅ Perfect
getCertificateById()	GET /api/certificates/:id	✅ Perfect
verifyCertificate()	POST /api/certificates/verify	✅ Perfect
exportAttendedUsers()	GET /api/certificates/export-attended/:eventId	✅ Perfect
retryCertificateGeneration()	POST /api/certificates/:id/retry	✅ Perfect
generateBatchCertificates()	POST /api/certificates/generate-batch	✅ Perfect
getCertificateProgress()	GET /api/certificates/progress/:eventId	✅ Perfect
sendCertificateNotification()	POST /api/certificates/:id/notify	✅ Perfect
getCertificateDashboard()	GET /api/certificates/dashboard	✅ Perfect
bulkRetryFailedCertificates()	POST /api/certificates/:eventId/bulk-retry	✅ Perfect
Institutions APIs - 100% Aligned
Frontend API	Backend Route	Status
searchInstitutions()	GET /api/institutions/search	✅ Perfect
getInstitutionById()	GET /api/institutions/:id	✅ Perfect
setInstitutionForMe()	POST /api/users/me/set-institution	✅ Perfect
requestNewInstitution()	POST /api/institutions/request-new	✅ Perfect
getPendingInstitutionVerifications()	GET /api/institutions/pending-verifications	✅ Perfect
approveInstitutionVerificationAPI()	POST /api/institutions/:id/approve-verification	✅ Perfect
rejectInstitutionVerificationAPI()	POST /api/institutions/:id/reject-verification	✅ Perfect
getInstitutionAnalytics()	GET /api/institutions/:id/analytics	✅ Perfect
getInstitutionDashboard()	GET /api/institutions/:id/dashboard	✅ Perfect
Host APIs - 100% Aligned
Frontend API	Backend Route	Status
getHostDashboard()	GET /api/hosts/dashboard	✅ Perfect
getMyEvents()	GET /api/hosts/my-events	✅ Perfect
createHostEvent()	POST /api/hosts/events	✅ Perfect
updateHostEvent()	PATCH /api/hosts/events/:id	✅ Perfect
deleteHostEvent()	DELETE /api/hosts/events/:id	✅ Perfect
getHostEventParticipants()	GET /api/hosts/events/:id/participants	✅ Perfect
Support APIs - 100% Aligned
Frontend API	Backend Route	Status
submitTicket()	POST /api/support/tickets	✅ Perfect
getMyTickets()	GET /api/support/tickets/my	✅ Perfect
getTicketById()	GET /api/support/tickets/:id	✅ Perfect
getAllTickets()	GET /api/support/tickets	✅ Perfect
updateTicket()	PATCH /api/support/tickets/:id	✅ Perfect
getSupportAnalytics()	GET /api/support/analytics	✅ Perfect
Notifications APIs - 100% Aligned
Frontend API	Backend Route	Status
getNotifications()	GET /api/users/notifications	✅ Perfect
markNotificationAsRead()	PATCH /api/users/notifications/:id/read	✅ Perfect
markAllNotificationsAsRead()	PATCH /api/users/notifications/read-all	✅ Perfect
getMyNotificationPreferences()	GET /api/users/me/notification-preferences	✅ Perfect
updateMyNotificationPreferences()	PATCH /api/users/me/notification-preferences	✅ Perfect
⚠️ MISSING FRONTEND APIs
Recommendation APIs - Backend exists, Frontend missing
Backend Route	Frontend API	Status
GET /api/recommendations/events	❌ Missing	�� Not implemented
GET /api/recommendations/events/:eventId/similar	❌ Missing	�� Not implemented
POST /api/recommendations/preferences	❌ Missing	🔴 Not implemented
User Management APIs - Backend exists, Frontend missing
Backend Route	Frontend API	Status
POST /api/users/updatePreferences	❌ Missing	�� Not implemented
POST /api/users/track-referral	❌ Missing	�� Not implemented
GET /api/users/badges	❌ Missing	�� Not implemented
POST /api/users/me/request-host	❌ Missing	�� Not implemented
GET /api/users/host-requests/pending	❌ Missing	�� Not implemented
POST /api/users/host-requests/:id/approve	❌ Missing	�� Not implemented
POST /api/users/host-requests/:id/reject	❌ Missing	�� Not implemented
POST /api/users/logout	❌ Missing	🔴 Not implemented
Feedback APIs - Backend exists, Frontend missing
Backend Route	Frontend API	Status
POST /api/feedback	❌ Missing	�� Not implemented
GET /api/feedback/my	❌ Missing	�� Not implemented
GET /api/feedback/all	❌ Missing	�� Not implemented
PATCH /api/feedback/:id/status	❌ Missing	�� Not implemented
GET /api/feedback/analytics	❌ Missing	🔴 Not implemented
�� IMPLEMENTATION GAPS
Frontend Components Using Mock Data
HostDashboard.jsx - Uses mock data instead of getHostDashboard() API
Feedback.jsx - Has TODO comments for backend integration
HelpCenter.jsx - Has TODO comments for support ticket API
Missing API Integration
Recommendation System - Complete ML recommendation system exists in backend but no frontend integration
Feedback System - Backend fully implemented, frontend only has UI
Host Request System - Backend implemented, frontend missing
User Preferences - Backend has advanced preference system, frontend basic
📊 Alignment Summary
Category	Total Backend Routes	Frontend APIs	Aligned	Missing	Alignment %
User Management	25	18	18	7	72%
Events	22	22	22	0	100%
Certificates	13	13	13	0	100%
Institutions	9	9	9	0	100%
Host	6	6	6	0	100%
Support	6	6	6	0	100%
Notifications	5	5	5	0	100%
Recommendations	3	0	0	3	0%
Feedback	5	0	0	5	0%
TOTAL	94	79	79	15	84%
�� Key Findings
✅ Excellent Core Alignment: 84% of backend routes have corresponding frontend APIs
✅ Perfect Feature Coverage: Events, Certificates, Institutions, Host, Support, and Notifications are 100% aligned
⚠️ Missing Advanced Features: Recommendation system and feedback system are fully implemented in backend but missing frontend integration
⚠️ Incomplete User Features: Some advanced user management features (host requests, preferences, badges) are missing from frontend
🔧 Implementation Gaps: Some components use mock data instead of real APIs
🚀 Recommendations
Priority 1: Complete Missing Frontend APIs
Create Frontend/src/api/recommendations.js - Implement ML recommendation system integration
Create Frontend/src/api/feedback.js - Implement feedback system integration
Add missing user APIs - Host requests, preferences, badges, logout
Priority 2: Replace Mock Data with Real APIs
Update HostDashboard.jsx - Use real getHostDashboard() API
Update Feedback.jsx - Integrate with feedback API
Update HelpCenter.jsx - Integrate with support ticket API
Priority 3: Enhance User Experience
Implement recommendation system - Show personalized event recommendations
Add feedback collection - Allow users to submit feedback and track responses
Complete host onboarding - Allow users to request host status
🎉 Conclusion
The frontend and backend APIs are 84% aligned, which is excellent for a complex application. The core functionality (events, certificates, institutions, host management, support, notifications) is perfectly aligned. The main gaps are in advanced features like recommendations and feedback systems, which are fully implemented in the backend but need frontend integration.
The architecture is solid, and the remaining work is primarily about connecting existing backend functionality to the frontend rather than building new features from scratch.
atleast for user do align it, and feedback,
recommendation is not done yet.
