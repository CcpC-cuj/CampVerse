# CampVerse
## System Design

- Frontend (Vite + React) at `/frontend` handles UI, auth flows, dashboards.
- Backend (Node + Express) at `/backend` handles:
    - User & institution management
    - Event CRUD + verification flows
    - JWT-based auth + RBAC
    - Certificates, participation logs, notifications
- ML service at `/ml` does:
    - Recommendations
    - Search analytics + trending detection
- Data stored in MongoDB (users, events, logs, certificates).
- Redis used for caching sessions, leaderboard trends.
- CI/CD via GitHub Actions builds + tests each module, pushes to Docker Hub, then deploys via K8s / Docker Compose.


```
+-------------------------------+
|         Client Side           |
|  (Vite + React Frontend)      |
|     /frontend                 |
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
|    | (Node + Express)|    |  (/ml)           |    | (Socket.io/FCM)  |  |
|    |   /backend      |    |                  |    |                  |  |
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
| `/frontend` | Vite + React app | Auth flows, event discovery, user profiles, admin dashboards |
| `/backend` | Node + Express    | All REST APIs: auth, roles, events, participation, certificates |
| `/ml`      | ML microservice   | Recommendations, personalization, trending analysis    |

 **Each one independently tested, containerized, and deployed.**  
Your CI/CD can loop through these or trigger based on changes.

---

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

---

## 🔐 Google OAuth & Academic Email Enforcement
- Google login uses the OAuth **access token** to fetch user info from Google.
- Only academic emails (`.ac.in` or `.edu.in`) are allowed for Google login.
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
   - Backend API: http://localhost:5000
   - ML Service: http://localhost:8000
   - MongoDB: localhost:27017
   - Redis: localhost:6379

2. **Environment Variables:**
   - Copy `.env.example` to `.env` in each service directory and fill in secrets as needed.

3. **Stopping services:**
   ```bash
   docker-compose down
   ```

---

# How security & RBAC fits in

- JWTs issued by `/backend` (user service).
- Frontend stores in secure cookies / localStorage.
- Middleware in `/backend` checks:
  - `roles.includes("platformAdmin")` for sensitive admin actions.
  - `canHost` and `isVerified` for event creation.
- Audit trail logged in `eventVerifications` for all approvals.

---

# How data is laid out (DB)

| Service         | DB Collections                                                                 |
|-----------------|--------------------------------------------------------------------------------|
| `/backend`      | `users`, `institutions`, `events`, `eventParticipationLogs`, `eventVerifications`, `userCertificates`, `notifications`, `achievements` |
| `/ml`           |  Reads `eventParticipationLogs` for trends          |
| `/backend`/`ml` | Redis for: active sessions, popular events caching                             |
