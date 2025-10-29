# Certificate Microservices TODO List

This document tracks the steps and context for building a certificate generation and verification platform with host-driven customization, admin-managed templates, Supabase/Firebase asset storage, and user/student download/verification.

## Context & Goals
- Platform supports event-based certificate generation.
- Admins upload/manage certificate templates (Supabase/Firebase).
- Hosts (event organizers) select templates, upload logos/signatures, customize content, and request certificate generation for participants.
- Users/students download certificates and verify authenticity.
- Verifiers check certificate validity via QR code or certificate ID.
- All assets (templates, logos, signatures, generated certificates) stored in Supabase/Firebase.
- Security: JWT/OAuth, asset validation, access control.
- Generated certificates should be visible in each user's profile under the "Past Events" section. Users can view and download certificates for events they participated in. This requires linking certificate records to user profiles and event history in the metadata DB and frontend.

## TODO List

### 1. Backend Microservices & DB
- [ ] Scaffold microservices:
    - Template service (admin CRUD, gallery for hosts)
    - Asset service (logo/signature upload, Supabase/Firebase integration)
    - Config service (host-specific certificate config)
    - Generation service (accept jobs, create certificates, store output)
    - Verification service (validate certificates)
- [ ] Set up metadata DB:
    - Tables for templates, assets, jobs, certificates, verification records
    - Table for certificate_requests (host_id, event_id, count, last_requested)
    - Link certificates to user profiles and event participation records for profile display
    - Ensure generated certificates are queryable by user and event for frontend profile rendering
- [ ] Integrate Supabase/Firebase SDK for asset management

### 2. Frontend UX & Flow
- [ ] Host dashboard:
    - Show template gallery (admin-approved only)
    - Asset upload fields (logo, signature)
    - Content entry (event name, award text, signatory info)
    - Participant list upload (CSV/manual)
    - Live preview before generation
    - Job status/progress bar
    - Download links for generated certificates
- [ ] User/student portal:
    - Download certificate for event
    - Verification link/QR code
    - Show generated certificates in user's profile under "Past Events" section
    - View/download certificates for each event participated
- [ ] Admin dashboard:
    - Upload/manage templates
    - Approve templates for host use

### 3. Certificate Generation Logic
- [ ] Track certificate generation requests per host (count, timestamps)
- [ ] Validate uploads (type, size, virus scan)
- [ ] Generate certificates using selected template and uploaded assets
- [ ] Store generated certificates in Supabase/Firebase
- [ ] Embed QR code/certificate ID for verification

### 4. Verification Portal
- [ ] Endpoint `/verify/{cert_id}` for QR/ID-based verification
- [ ] Portal UI for verifiers to check certificate validity

### 5. Security & Monitoring
- [ ] Protect endpoints with JWT/OAuth
- [ ] Monitor job durations, error rates, asset usage
- [ ] Add integration tests for upload, generation, download, verification

### 6. Optional Enhancements
- [ ] Webhook/callback for job completion notifications
- [ ] Digital signature support for certificates
- [ ] Asset cleanup for unused/orphaned files
- [ ] Prometheus/Grafana dashboards for monitoring

---

**If you need code samples, API contracts, or wireframes for any part, specify which and they will be provided.**
