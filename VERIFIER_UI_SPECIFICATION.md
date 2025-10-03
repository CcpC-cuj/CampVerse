# Verifier Dashboard UI Specification

## 1. Overview

The Verifier Dashboard enables authorized users (verifiers) to:
- Review and approve/reject host requests (users wanting to become hosts)
- View submitted documents (e.g., ID card images)
- Verify event-related requests (e.g., event participation, certificates)
- See status, remarks, and history for each request

## 2. UI Structure

### Main Sections

- **Sidebar/Navigation**
  - Dashboard (Home)
  - Host Requests
  - Event Verifications
  - Logout

- **Host Requests Page**
  - List of pending host requests
  - Details panel for selected request
    - User info (name, email, roles, etc.)
    - ID card image (rendered)
    - Submitted documents (if any)
    - Request status (pending/approved/rejected)
    - Action buttons: Approve, Reject, Add Remarks

- **Event Verifications Page**
  - List of event verification requests
  - Details panel for selected event request
    - Event info (name, date, organizer)
    - User info (participant)
    - Supporting documents/images
    - Verification status
    - Action buttons: Approve, Reject, Add Remarks

## 3. API Endpoints

### Authentication

- **Login (Verifier)**
  - `POST /api/users/login`
  - Request: `{ email, password }`
  - Response: `{ token }`
  - Store token in localStorage/context for subsequent requests

### Host Requests

- **Get All Host Requests**
  - `GET /api/users/host-requests`
  - Headers: `Authorization: Bearer <token>`
  - Response: `[ { _id, userId, status, remarks, documents, createdAt, ... } ]`

- **Get Host Request Details**
  - `GET /api/users/host-requests/:requestId`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ ...requestDetails, user: { name, email, idCardImage, ... } }`

- **Approve Host Request**
  - `POST /api/users/host-requests/:requestId/approve`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ remarks: "Approved by verifier" }`
  - Response: `{ success: true, ... }`

- **Reject Host Request**
  - `POST /api/users/host-requests/:requestId/reject`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ remarks: "Reason for rejection" }`
  - Response: `{ success: true, ... }`

### Event Verifications

- **Get All Event Verification Requests**
  - `GET /api/events/verification-requests`
  - Headers: `Authorization: Bearer <token>`
  - Response: `[ { _id, eventId, userId, status, documents, ... } ]`

- **Get Event Verification Request Details**
  - `GET /api/events/verification-requests/:requestId`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ ...requestDetails, event: { name, date, ... }, user: { name, email, ... } }`

- **Approve Event Verification**
  - `POST /api/events/verification-requests/:requestId/approve`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ remarks: "Approved by verifier" }`
  - Response: `{ success: true, ... }`

- **Reject Event Verification**
  - `POST /api/events/verification-requests/:requestId/reject`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ remarks: "Reason for rejection" }`
  - Response: `{ success: true, ... }`

## 4. Data Flow

1. **Verifier logs in** → JWT token stored
2. **Dashboard loads** → Fetches pending host/event requests via API
3. **Verifier selects a request** → Fetches details, including user info and document/image URLs
4. **UI renders user/event info, images, documents**
5. **Verifier takes action (approve/reject/add remarks)** → Sends API request, updates UI on success

## 5. UI Components

- **RequestList**: Table/list of requests (host/event), sortable/filterable
- **RequestDetails**: Panel showing all details for selected request
  - User info: name, email, roles
  - Event info (for event requests)
  - Document/image viewer (ID card, certificates, etc.)
  - Status, remarks, timestamps
  - Action buttons (approve/reject/remarks)
- **ImageViewer**: Component to render images from URLs
- **RemarksModal**: Modal for entering remarks on approval/rejection
- **Notification/Toast**: Show success/error messages

## 6. Example Data Structures

### Host Request Example

```json
{
  "_id": "68de837e3dd647fb5185721c",
  "userId": "user123",
  "status": "pending",
  "remarks": "",
  "documents": [
    { "type": "idCard", "url": "https://.../idcard.jpg" }
  ],
  "createdAt": "2025-10-02T10:00:00Z",
  "user": {
    "name": "Tarik Anwar",
    "email": "tarik.22190503033@cuj.ac.in",
    "idCardImage": "https://.../idcard.jpg"
  }
}
```

### Event Verification Request Example

```json
{
  "_id": "abc123",
  "eventId": "event456",
  "userId": "user789",
  "status": "pending",
  "documents": [
    { "type": "certificate", "url": "https://.../certificate.pdf" }
  ],
  "event": {
    "name": "Testing 3",
    "date": "2025-10-01"
  },
  "user": {
    "name": "Krish",
    "email": "krish.22190503027@cuj.ac.in"
  }
}
```

## 7. Implementation Roadmap

1. **Set up authentication context** for JWT token management
2. **Create API service layer** for all endpoints above
3. **Build RequestList component** for host/event requests
4. **Build RequestDetails component** to show all info and images/documents
5. **Implement Approve/Reject actions** with remarks modal
6. **Add image/document viewer** for ID cards, certificates, etc.
7. **Handle API errors and show notifications**
8. **Test with real data and edge cases (missing images, already approved, etc.)**

## 8. Additional Notes

- All images/documents should be rendered using URLs from the API response.
- Only verifiers with valid JWT tokens can access these endpoints.
- UI should auto-refresh after actions (approve/reject).
- Use loading spinners for API calls.
- Ensure accessibility for document/image viewing.

---

This document provides all necessary details for an engineer or AI to build the Verifier UI for host and event verification, including API usage, UI structure, data flow, and component responsibilities. No further explanation is needed.
