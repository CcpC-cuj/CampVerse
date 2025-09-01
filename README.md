# CampVerse
## System Design

- Frontend (Vite + React) at `/Frontend` handles UI, auth flows, dashboards.
- Backend (Node + Express) at `/Backend` handles:
    - User & institution management
    - Event CRUD + verification flows
    - JWT-based auth + RBAC
    - Certificates, participation logs, notifications
- ML service at `/ML` (optional; disabled by default in Docker Compose) does:
    - Recommendations
    - Search analytics + trending detection
- Data stored in MongoDB (users, events, logs, certificates).
- Redis used for caching sessions, leaderboard trends.
- CI/CD (optional/planned): GitHub Actions builds and tests each module, pushes to a registry, then deploys via Docker Compose or Kubernetes. This may not be enabled in this repo yet.


```
+-------------------------------+
|         Client Side           |
|  (Vite + React Frontend)      |
|     /Frontend                 |
+-------------------------------+
              |
              v
+-------------------------------+
|         API Gateway /         |
|        Reverse Proxy          |
|    (NGINX / Express Proxy)    |
+-------------------------------+
              |
              v
__________________________________________________________________________
|    +-----------------+    +------------------+    +------------------+  |
|    | Backend Service |    |  ML Service      |    | Notification Svc |  |
|    | (Node + Express)|    |  (/ML)           |    | (Socket.io/FCM)  |  |
|    |   /Backend      |    |                  |    |                  |  |
|    +-----------------+    +------------------+    +------------------+  |
|        |                      |                      |                  |
|    +-----------------+    +------------------+    +------------------+  |
|    | MongoDB Atlas   |    | MongoDB for ML   |    | Redis (optional)|   |
|    | users, events,  |    | analytics, recs  |    | sessions, cache |   |
|    | certs, logs     |    +------------------+    +------------------+  |
|    +-----------------+                                                  |
|_________________________________________________________________________|
             +-----------------------------------------+
             |  External Integrations                 |
             | - Payment (Stripe/UPI)                 |
             | - Email/FCM for notifications          |
             | - Github Actions (CI/CD) + Docker Hub  |
             | - Kubernetes / ECS for deployments     |
             +-----------------------------------------+


#  Responsibilities mapped to your repo

| Folder     | Description      | What it handles                                        |
|------------|------------------|-------------------------------------------------------|
| `/Frontend` | Vite + React app | Auth flows, event discovery, user profiles, admin dashboards |
| `/Backend` | Node + Express    | All REST APIs: auth, roles, events, participation, certificates |
| `/ML`      | ML microservice   | Recommendations, personalization, trending analysis (optional; disabled by default)   |

 **Each one independently tested, containerized, and deployed.**  
Your CI/CD can loop through these or trigger based on changes.

---

## Project Overview

CampVerse is a full-stack platform for event discovery and management with certificates, support ticketing, and institution verification workflows.

Frontend: React (Vite) under `Frontend/`.
Backend: Node + Express under `Backend/` with MongoDB and Redis. ML service optional under `ML/`.

API docs: when backend is running, visit `/api-docs`.

## Environment setup (local)

1. Prerequisites: Node.js LTS, npm, Docker (optional), MongoDB, Redis.
2. Backend env: copy `Backend/env.test.example` to `Backend/.env` and fill values; keep existing hard-coded values in code unchanged.
3. Install deps:
   ```bash
   cd Backend && npm install
   cd ../Frontend && npm install
   ```
4. Run locally:
   ```bash
   # Backend
   cd Backend && npm run dev
   # Frontend
   cd ../Frontend && npm run dev
   ```

Backends runs on http://localhost:5001, Frontend on http://localhost:5173 by default.

## Folder structure

- `Frontend/` React app (Vite)
  - `src/api/` API wrappers: events, certificates, support, host, institution, user, notification
  - `src/components`, `src/pages`, `src/userdashboard`, etc.
- `Backend/` Node + Express API
  - `Routes/`, `Controller/`, `Models/`, `Services/`, `Middleware/`
- `ML/` Optional recommendation service
- `docs/` Documentation including `backend-overview.md`

## Backend endpoints and frontend usage

- Events (`/api/events`): list/create/get/update/delete, RSVP, participants, analytics, co-host, search. Use `src/api/events.js`.
- Hosts (`/api/hosts`): dashboard, my-events, CRUD, participants. Use `src/api/host.js`.
- Institutions (`/api/institutions`): search, request-new, approvals, analytics, dashboard. Use `src/api/institution.js`.
- Certificates (`/api/certificates`): generate, stats, verify, progress, dashboard. Use `src/api/certificates.js`.
- Support (`/api/support`): tickets, admin operations, analytics. Use `src/api/support.js`.
- Feedback (`/api/feedback`): submit from UI (multipart if attachment). Use a simple fetch from components or add wrapper if needed.
- Users (`/api/users`): auth/profile/notifications. Use `src/api/user.js` and `src/api/notification.js`.

## Changes and fixes from latest audit

- Added frontend API wrappers aligned with backend:
  - `src/api/events.js`, `src/api/certificates.js`, `src/api/support.js`, completed `src/api/host.js`, extended `src/api/institution.js`.
  - Updated `src/api/index.js` to export all wrappers.
- Safe handling of removed backend endpoint: institution `request-verification` now a no-op on frontend to avoid crashes.
- No code style changes to hard-coded values; deployment configuration preserved for Render.

See `docs/backend-overview.md` for a concise backend module and endpoint summary.

## 🚀 Quick Start with Docker Compose

### 1. Build and Start All Services
```bash
docker-compose up --build
```
- Builds and starts frontend, backend, MongoDB, and Redis containers.
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

### 2. Stop All Services
```bash
docker-compose down
```

### 3. Rebuild a Specific Service
```bash
docker-compose build backend
# or
docker-compose build frontend
```

### 4. View Logs
```bash
docker-compose logs backend
# or
docker-compose logs frontend
```

### 5. Troubleshooting
- Ensure ports 3000 (frontend) and 5001 (backend) are free.
- If you change Dockerfile, nginx.conf, or package.json, always rebuild the image.
- API docs available at: http://localhost:5001/api-docs (when backend is running)

---

## 🔐 Google OAuth & Academic Email Enforcement
- Google login uses the OAuth **access token** to fetch user info from Google.
- Only academic emails (`.ac.in`, `.edu.in`, or `.edu`) are allowed for Google login.
- If a non-academic email is used, the user will see an error and a Logout/Back button in the UI.
- All debug logs have been removed from production code; only errors are logged.

---

## 🛠️ Error Handling & User Experience
- All authentication errors are clearly shown in the UI.
- If Google login fails (invalid token, non-academic email), the user is prompted to log out or go back and try again.

---

## 🚀 Local Development with Docker Compose

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - ML Service (optional, disabled by default): http://localhost:8000
   - MongoDB: localhost:27017
   - Redis: localhost:6379

2. **Environment Variables:**
   - Copy `.env.example` to `.env` in each service directory and fill in secrets as needed.
      - Note: Docker Compose sets most required env vars for the backend. If running services without Docker, create `.env` files accordingly.

3. **Stopping services:**
   ```bash
   docker-compose down
   ```

---

# How security & RBAC fits in

- JWTs issued by `/Backend` (user service).
- Frontend stores in secure cookies / localStorage.
- Middleware in `/Backend` checks:
  - `roles.includes("platformAdmin")` for sensitive admin actions.
  - `canHost` and `isVerified` for event creation.
- Audit trail logged in `eventVerifications` for all approvals.

---

# How data is laid out (DB)

| Service         | DB Collections                                                                 |
|-----------------|--------------------------------------------------------------------------------|
| `/Backend`      | `users`, `institutions`, `events`, `eventParticipationLogs`, `eventVerifications`, `userCertificates`, `notifications`, `achievements` |
| `/ML`           |  Reads `eventParticipationLogs` for trends          |
| `/Backend`/`ML` | Redis for: active sessions, popular events caching                             |
