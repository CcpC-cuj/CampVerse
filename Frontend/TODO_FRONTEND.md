# CampVerse Frontend TODO

> **Note:** This document only specifies what UI screens, forms, fields, and flows are required for the CampVerse frontend. It does **not** prescribe or suggest any visual design, layout, responsiveness, branding, or style. All design decisions are left to the frontend team.

---

## Required UI Screens & Flows

### 1. User Registration & Authentication
- Registration screen (fields: name, email, phone, password)
- OTP verification screen (fields: email, OTP)
- Login screen (fields: email, password)
- Google OAuth2 login flow (enforce academic email)
- Password reset flow (screens for forgot and reset, fields: email, token, new password)

### 2. User Dashboard & Profile
- Dashboard screen (must display user stats: events, certificates, achievements, profile completion)
- Profile screen (view/edit fields: name, phone, Gender, DOB, profile photo, collegeIdNumber, interests, skills, learning goals)
- Preferences update flow (fields: interests, skills, learning goals, badges, location)
- Badges and achievements view
- Notifications view (in-app)

### 3. Host Workflow
- Host request form (field: remarks, submit action)
- Host request status display (pending/approved/rejected)
- Verifier dashboard (for verifiers):
  - List of pending host requests
  - Approve/reject actions (field: remarks)
- Host dashboard (must show analytics: total events, participants, upcoming events)
- List of events hosted by user
- Event creation form (fields: title, description, tags, type, schedule [start/end], isPaid [default: false])
- Event edit form (fields as above)
- Event delete action (confirmation required)
- Event participants view
- Event approval status display (pending/approved/rejected)

### 4. General Application Flows
- Navigation (must provide access to all required screens based on user role)
- Error message display for failed API calls
- Success message display for successful actions
- Loading indicator for async actions
- JWT token storage and usage for API calls
- Route protection (redirect to login if not authenticated)
- Role-based access (show/hide screens and actions based on user role)

### 5. Future/Optional Features
- Event participation/registration flow (for students)
- Certificate download/view flow
- Paid event/payment flow (hide for now, but support "Free" event type)
- Institution statistics view (for institution users)
- Event search/filter flow
- Admin analytics view

---

## Required Input Fields by Flow

### Registration
- name (string, required)
- email (string, required, must be .ac.in/.edu.in)
- phone (string, required)
- password (string, required, min 6 chars)

### OTP Verification
- email (string, required)
- otp (string, required, 6 digits)

### Login
- email (string, required)
- password (string, required)

### Profile Update
- name, phone, Gender, DOB, profilePhoto, collegeIdNumber, interests, skills, learningGoals (all optional, at least one required for update)

### Host Request
- remarks (string, required)

### Event Creation
- title (string, required)
- description (string, required)
- tags (array of strings, optional)
- type (string, required, e.g. "Workshop", "Seminar")
- schedule (object, required: start [datetime], end [datetime])
- isPaid (boolean, required, default: false)

### Event Edit
- Any event field (see above)

### Password Reset
- email (string, required for forgot)
- token (string, required for reset)
- new password (string, required for reset)

---

**Status:**
- All listed screens, forms, and flows are required for MVP unless marked as future/optional.
- Coordinate with backend team for any API changes or clarifications. 