# CampVerse Event Module - Error Log

## Critical Backend Error: User.hostEligibilityStatus Not Initialized by Default

- **Issue:**
  - The `hostEligibilityStatus` field is not present by default in user documents.
  - This causes unpredictable backend/frontend behavior when checking host eligibility or updating status.
  - New users do not have `hostEligibilityStatus`, so host request/status logic may fail or require extra checks.

- **Fix Required:**
  - Add `hostEligibilityStatus` to the User model (schema) with a default value: `{ status: "none" }`.
  - Ensure all new users have this field initialized automatically.
  - Update backend logic to rely on this field being present for all users.

- **Suggested Implementation:**
  - In `Backend/Models/User.js`, add:
    ```js
    hostEligibilityStatus: {
      type: {
        status: { type: String, default: "none" },
        requestedAt: { type: Date },
        approvedBy: { type: String },
        approvedAt: { type: Date },
        remarks: { type: String }
      },
      default: { status: "none" }
    },
    ```
  - Run a migration script to add `{ status: "none" }` to all existing users missing this field.

- **Status:** Open


## Date: October 1, 2025

---

## UI Errors

### 1. User Profile Image Not Displayed Correctly
- **Issue:**
  - `<img alt="Profile" class="w-12 h-12 rounded-full object-cover" src="/default-avatar.png">` always shows default avatar.
  - User's profile image from backend is not shown.
  - If user is a Google user, their Google profile image should be used.
  - If no image is available, default avatar should be shown.
  - During profile completion, user should be prompted to upload a profile image if none exists.

- **Fix Required:**
  - Update frontend logic to:
    1. Try to display user's profile image from backend (`user.profileImage` or similar field).
    2. If not available, check for Google profile image (`user.googleProfileImage` or similar).
    3. If neither is available, show `/default-avatar.png`.
    4. During profile completion, prompt user to upload a profile image if none exists.

- **Suggested Implementation:**
  - In profile/avatar component:
    ```jsx
    <img
      alt="Profile"
      className="w-12 h-12 rounded-full object-cover"
      src={user.profileImage || user.googleProfileImage || "/default-avatar.png"}
    />
    ```
  - In profile completion flow:
    - If `!user.profileImage && !user.googleProfileImage`, show upload prompt.

---

### 2. Event Cards Are Static, Not Fetched from Backend
- **Issue:**
  - The event cards in the user dashboard are currently hardcoded/static in the UI.
  - Event details (image, title, date, location, tags) should be fetched dynamically from the backend API.
  - Users should see real events from the backend, not static demo data.
  - The dashboard must show both public events and institution events associated with the user's domain.

- **Fix Required:**
  - Update frontend event dashboard component to fetch event data from backend API (e.g., `/api/events`).
  - Render event cards dynamically using fetched data.
  - Ensure event images, titles, dates, locations, and tags are mapped from backend response.
  - Filter and display both public events and institution events relevant to the user's domain.

- **Suggested Implementation:**
  - Use `useEffect` to fetch events on component mount.
  - Store events in state and map over them to render cards.
  - Example:
    ```jsx
    useEffect(() => {
      fetch('/api/events?type=all')
        .then(res => res.json())
        .then(data => setEvents(data));
    }, []);

    {events.map(event => (
      <img src={event.imageUrl || '/default-event.png'} ... />
      <h3>{event.title}</h3>
      <p>{event.date} • {event.location}</p>
      {/* ...tags... */}
    ))}
    ```
  - Filter events in the backend or frontend to show only those that are public or match the user's institution/domain.

---

### 3. No UI for 'Become a Host' Flow
- **Issue:**
  - There is no UI implemented for the 'Want to become a host?' flow.
  - The expected flow:
    1. User clicks 'Become a Host' button.
    2. Modal opens: 'Become a Host' with email input, Cancel/Continue buttons, and redirect notice.
    3. After Continue, user is redirected to Host Registration page.
    4. Host Registration page shows email, Back button, and 'Go to Manage Events' button.
    5. User should be prompted to upload required documents (e.g., ID card) for verification.
  - Backend implementation for ID card upload is present, but frontend UI for this step is missing.

- **Fix Required:**
  - Implement the full 'Become a Host' UI flow:
    - Modal for host registration initiation.
    - Host Registration page with email and navigation.
    - Upload field for ID card/document verification.
    - Integrate with backend endpoint for document upload and host profile creation.

- **Suggested Implementation:**
  - Create modal component for host registration initiation.
  - Create Host Registration page with email display and upload field.
  - Use file input to upload ID card and POST to backend.
  - Show navigation to Manage Events dashboard after successful registration.

---

### 4. No UI Feedback for Host Request Pending Verification
- **Issue:**
  - After a user submits a request to become a host (with ID card upload), there is no UI feedback indicating the request is pending verification.
  - Backend tracks host request status (`user.hostEligibilityStatus.status`), and notifies verifiers/admins via `notifyHostRequest`.
  - Users should see a message like "Your request to become a host is submitted. It will be verified soon." and a status indicator while waiting for verification.

- **Fix Required:**
  - After host request submission, show a confirmation message and status indicator in the user dashboard.
  - If `user.hostEligibilityStatus.status === 'pending'`, display a "pending verification" notice.
  - Update UI to reflect backend status changes (pending, verified, rejected).

- **Suggested Implementation:**
  - In dashboard/profile component:
    ```jsx
    {user.hostEligibilityStatus?.status === 'pending' && (
      <div className="bg-yellow-100 text-yellow-800 p-2 rounded">
        Your request to become a host is submitted. It will be verified soon.
      </div>
    )}
    ```
  - Update status dynamically based on backend response.

---

## Backend Errors

*No backend errors reported for this issue.*

---

## Error Reporting Instructions
- Add any new UI or backend errors to this file.
- Include:
  - **Issue description**
  - **Screenshot or code snippet (if possible)**
  - **Suggested fix or implementation**
  - **Status (open/fixed)**

---

## Status
- **Open Issues:** 4 (User profile image logic, Event cards static, Become a Host UI missing, Host request pending feedback)
- **Fixed Issues:** 0

---

**Last Updated:** October 1, 2025
