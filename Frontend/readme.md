# Frontend - CAMPVERSE

Welcome to the **frontend** of **CAMPVERSE** — a modern event personalization web application. This React/Vite project provides a seamless UI for users to browse, discover, RSVP, and manage events, with full integration to the CAMPVERSE backend.

---

## ✨ Project Overview
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM
- **Linting:** ESLint (Airbnb style)
- **API Integration:** Connects to CAMPVERSE backend for authentication, user management, events, etc.
- **Production Ready:** Dockerfile and nginx config included for deployment

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
cd Frontend
npm install
```

### 2. Development
```bash
npm run dev
```
- Runs the app in development mode (default Vite: http://localhost:5173)
- The page will reload if you make edits.

### 3. Linting
```bash
npm run lint
```
- Checks code for style and errors using ESLint (Airbnb config).

### 4. Build for Production
```bash
npm run build
```
- Builds the app for production to the `dist/` folder.

### 5. Preview Production Build
```bash
npm run preview
```
- Serves the production build locally for testing.

---

## 🗂️ Folder Structure (Key Parts)
```
Frontend/
├── src/
│   ├── landing/         # Landing page components (navbar, hero, features, faq, dashboard, etc.)
│   ├── pages/           # Main pages (landing, login, signup, modals)
│   ├── assets/          # Static assets (images, icons, etc.)
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Entry point
├── public/              # Static files
├── package.json         # Project metadata and scripts
├── vite.config.js       # Vite configuration
├── Dockerfile           # For containerized builds
├── nginx.conf           # For static deployment with nginx
└── ...
```

---

## 🧩 Main Pages & Components
- **Landing Page:** `/` (src/pages/landing.jsx, src/landing/)
- **Login/Signup:** `/login`, `/signup` (src/pages/login.jsx, signup.jsx, LoginModal.jsx, SignupModal.jsx)
- **Dashboard:** `/dashboard` (src/landing/dashboard.jsx)
- **UI Components:** Navbar, Hero, Features, FAQ, Footer, Testimonials, etc.

---

## 🔗 API Integration
- All authentication and user actions connect to the CAMPVERSE backend (see backend README for endpoints).
- **Google Sign-In:** Integrated via backend `/google-signin` endpoint.
- **Environment Variables:**
  - Create a `.env` file in `Frontend/` for API URLs, e.g.:
    ```env
    VITE_API_URL=http://localhost:5001
    ```
  - Use `import.meta.env.VITE_API_URL` in your code to access the backend URL.

---

## 🔐 Google OAuth, Academic Email Enforcement & Error Handling
- **Google Sign-In** is integrated via the backend `/google-signin` endpoint.
- Only academic emails (`.ac.in`, `.edu.in`, or `.edu`) are allowed for Google login. If a non-academic email is used, the user will see an error and a Logout/Back button.
- The **OAuthCallback** page handles the Google OAuth redirect, exchanges the access token for a JWT, and redirects to the dashboard on success.
- If an error occurs (e.g., non-academic email, invalid token), the UI displays a clear error message and provides a Logout and Back button for user recovery.
- All debug and info console logs have been removed from production code; only errors are logged in the console.

---

## 🛠️ Error Handling in the UI
- If Google login fails due to a non-academic email, the user is shown:
  - A clear error message
  - A **Logout** button (logs out and returns to landing page)
  - A **Back** button (returns to landing page)
- All error handling is robust and user-friendly.

---

## 🛠️ Linting & Code Quality
- ESLint is set up with Airbnb config for consistent, error-free code.
- Run `npm run lint` before committing code.

---

## 🐳 Production Build & Deployment
- **Docker:**
  - Use the provided `Dockerfile` to build a production image.
  - The app is served via nginx using the included `nginx.conf`.
- **Manual:**
  - After `npm run build`, serve the `dist/` folder with any static server (e.g., nginx, serve).

---

## 🤝 Contributing
- Follow the code style enforced by ESLint.
- Keep components modular and reusable.
- Document new pages/components in this README.

---

## 📚 Further Reading
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [CAMPVERSE Backend API Docs](../Backend/readme.md)

---
