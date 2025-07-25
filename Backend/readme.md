# Backend - CAMPVERSE

Welcome to the **backend** of **CAMPVERSE** — an event personalization web application at your footsteps to RSVP for events whenever you wish to attend.

## ✨ About CAMPVERSE
**CAMPVERSE** helps users seamlessly explore and RSVP to events of their choice. The backend handles event management, user authentication, RSVP tracking, and data storage and many more.


```mermaid
graph TD
  subgraph Frontend
    A[Next.js / React<br>Student & Admin Portals]
  end

  subgraph API Gateway
    B[NGINX / API Layer]
  end

  A --> B

  subgraph Backend Services
    C[User Service<br>Auth, Profiles, Verification]
    D[Event Service<br>CRUD, Verification, Payments]
    E[ML & Search Service<br>Recs, Analytics]
    F[Certificate Service]
    G[Notification Service<br>FCM / Email / WebSockets]
    H[Verifier Queue]
  end

  B --> C
  B --> D
  B --> E
  B --> F
  B --> G
  B --> H

  subgraph Databases
    I[MongoDB<br>users, institutions, achievements]
    J[MongoDB<br>events, logs, certs]
    K[MongoDB<br>searchAnalytics, badges]
    L[Redis<br>sessions, trends]
  end

  C --> I
  D --> J
  E --> K
  F --> J
  G --> I
  H --> J
  C --> L
  D --> L
  E --> L

  subgraph Integrations
    M[Payment Gateway<br>(Stripe / UPI)]
    N[FCM / SMTP]
  end

  D --> M
  G --> N

  subgraph CI/CD Pipeline
    O[GitHub Actions]
    P[Docker Build & Push]
    Q[K8s / ECS Deploy]
    R[Monitoring<br>Grafana / Prometheus / ELK]
    S[Slack / Discord Alerts]
  end

  O --> P
  P --> Q
  Q --> R
  Q --> S

---

## 🚀 User Module Endpoints

### Authentication & Registration
- `POST /register` — Register with academic email, phone, password (OTP sent to email)
- `POST /verify` — Verify OTP and complete registration/login
- `POST /login` — Login with email and password
- `POST /google-signin` — Login/Register with Google (academic email only)

### Profile & Preferences
- `GET /me` — Get logged-in user profile
- `PATCH /me` — Update own profile (name, phone, gender, DOB, profile photo, college ID, interests, skills, learning goals, badges)
- `POST /updatePreferences` — Update user preferences (collegeIdNumber, interests, skills, learningGoals, badges, location)

### User Management
- `GET /:id` — Get user by ID (self/admin)
- `PATCH /:id` — Update user by ID (self/admin)
- `DELETE /:id` — Delete user (admin only)
- `POST /:id/grant-host` — Grant host access (admin only)

### Certificates, Achievements, Events
- `GET /:id/certificates` — Get user certificates
- `GET /:id/achievements` — Get user achievements
- `GET /:id/events` — Get user event history (hosted, attended, saved, waitlisted)

---

### 🆕 Verifier Role & Access
- Users can be assigned the 'verifier' role by platformAdmin (developer group) only.
- `POST /:id/grant-verifier` — Assigns verifier role to a user (admin only)
- Verifier eligibility status is tracked (who approved, when, remarks)
- Only platformAdmin can assign host or verifier roles (`grant-host`, `grant-verifier`)

---

### 🔑 Password Reset Flow
- `