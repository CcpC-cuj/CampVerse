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


```


#  Responsibilities mapped to your repo

| Folder     | Description      | What it handles                                        |
|------------|------------------|-------------------------------------------------------|
| `/frontend` | Vite + React app | Auth flows, event discovery, user profiles, admin dashboards |
| `/backend` | Node + Express    | All REST APIs: auth, roles, events, participation, certificates |
| `/ml`      | ML microservice   | Recommendations, personalization, trending analysis    |

 **Each one independently tested, containerized, and deployed.**  
Your CI/CD can loop through these or trigger based on changes.

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
