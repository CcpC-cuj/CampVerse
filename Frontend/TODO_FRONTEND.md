# CampVerse Frontend TODO

This document lists all essential tasks for the frontend/UI team, based on the backend API, MVP requirements, and project structure. Use this as a checklist for UI development and integration.

---

## 🟢 **Phase 1: User Module (MVP)**

### 1. **User Registration & Authentication**
- [ ] Registration page (name, email, phone, password)
  - Required: name, email (.ac.in/.edu.in), phone, password
- [ ] OTP verification page (email, OTP input)
  - Required: email, OTP
- [ ] Login page (email, password)
  - Required: email, password
- [ ] Google OAuth2 login integration (academic email enforcement)
- [ ] Password reset (forgot/reset password flows)
  - Required: email (forgot), token + new password (reset)

### 2. **User Dashboard & Profile**
- [ ] Dashboard page (show stats: events, certificates, achievements, profile completion)
- [ ] Profile page (view/edit profile fields)
  - Editable: name, phone, Gender, DOB, profile photo, collegeIdNumber, interests, skills, learning goals
- [ ] Update preferences (interests, skills, learning goals, badges, location)
- [ ] View badges and achievements
- [ ] View notifications (in-app)

---

## 🟧 **Phase 2: Host Workflow**

### 3. **Host Request & Approval**
- [ ] Host request form (remarks input, submit button)
  - Required: remarks
- [ ] Show host request status (pending/approved/rejected)
- [ ] Verifier dashboard (for verifiers only):
  - List pending host requests
  - Approve/reject host requests (remarks input)

### 4. **Host Event Management**
- [ ] Host dashboard (analytics: total events, participants, upcoming events)
- [ ] List all events hosted by user
- [ ] Event creation form
  - Required: title, description, tags, type, schedule (start/end), isPaid (default: false)
- [ ] Event edit form (update event fields)
- [ ] Delete event (confirmation dialog)
- [ ] View event participants
- [ ] Show event approval status (pending/approved/rejected)

---

## 🟡 **Phase 3: General UI/UX**

### 5. **Navigation & Layout**
- [ ] Responsive navigation bar (role-based links: student, host, verifier, admin)
- [ ] Sidebar/dashboard navigation for hosts and verifiers
- [ ] Consistent theming and branding (CampVerse colors, logo, etc)

### 6. **Error Handling & Feedback**
- [ ] Show clear error messages for all failed API calls
- [ ] Show success notifications for actions (registration, event creation, etc)
- [ ] Loading spinners and disabled states for async actions

### 7. **Security & Access Control**
- [ ] JWT token storage (secure, httpOnly if possible)
- [ ] Route protection (redirect to login if not authenticated)
- [ ] Role-based UI rendering (hide/show features based on user role)

---

## 🟣 **Phase 4: Future Features (Optional/Planned)**
- [ ] Event participation/registration UI (for students)
- [ ] Certificate download/view UI
- [ ] Paid event/payment UI (hide for now, show "Free" badge)
- [ ] Institution statistics panel (for institution users)
- [ ] Advanced search/filter for events
- [ ] Analytics dashboard (admin)

---

## 📋 **Required Input Fields by Flow**

### **Registration:**
- name (string, required)
- email (string, required, must be .ac.in/.edu.in)
- phone (string, required)
- password (string, required, min 6 chars)

### **OTP Verification:**
- email (string, required)
- otp (string, required, 6 digits)

### **Login:**
- email (string, required)
- password (string, required)

### **Profile Update:**
- name, phone, Gender, DOB, profilePhoto, collegeIdNumber, interests, skills, learningGoals (all optional, but at least one required for update)

### **Host Request:**
- remarks (string, required)

### **Event Creation:**
- title (string, required)
- description (string, required)
- tags (array of strings, optional)
- type (string, required, e.g. "Workshop", "Seminar")
- schedule (object, required: start [datetime], end [datetime])
- isPaid (boolean, required, default: false)

### **Event Edit:**
- Any event field (see above)

### **Password Reset:**
- email (string, required for forgot)
- token (string, required for reset)
- new password (string, required for reset)

---

**Status:**
- MVP features must be completed before adding advanced features.
- Focus on clean, responsive UI and robust error handling.
- Coordinate with backend team for any API changes or clarifications. 