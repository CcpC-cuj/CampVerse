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
