# ML Integration TODOs for CampVerse Backend

This document lists all the requirements and integration points for ML features that the backend will need to implement or support, based on current and planned features.

---

## 1. Event Recommendation System
- [ ] Integrate with ML API to fetch personalized event recommendations for users (for dashboard display).
- [ ] Prepare endpoint (e.g., `/api/recommendations`) that calls the ML API and returns events for the user.
- [ ] Add fallback logic if the ML API is unavailable.
- [ ] Document expected ML API contract (input: user profile/history, output: event list).

## 2. Certificate Generation via ML
- [ ] Integrate with ML API for certificate generation.
- [ ] When host triggers certificate generation, backend should:
    - [ ] Pass the selected certificate template ID/reference (from event) to the ML API.
    - [ ] Pass the event logo URL (if uploaded) to the ML API.
    - [ ] Pass all required event/user data (name, email, event title, etc.).
- [ ] Store the returned certificate URL in the user’s certificate record.
- [ ] Ensure only users with 'attended' status are processed for certificate generation.
- [ ] (Planned) Store all generated certificates in a Google Drive folder named after the event.
- [ ] Document expected ML API contract (input: templateId, logo URL, user/event data; output: certificate URL/status).

## 3. Certificate Template Selection
- [ ] Add a field to the Event model: `certificateTemplateId` (string or ObjectId).
- [ ] Provide endpoint for host to set/change the template for their event.
- [ ] (Optional) Provide endpoint to fetch available templates (to be updated if ML team exposes a template API).

## 4. General ML API Integration
- [ ] Document all endpoints and data contracts for the ML team.
- [ ] Prepare for future changes in ML API (e.g., new templates, new certificate types).

---

*Update this file as ML requirements or integration points change, or as features are implemented.* 