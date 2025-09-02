import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Import pages
import Landing from "./pages/landing";
import UserDashboard from "./userdashboard/UserDashboard";
import Settings from "./userdashboard/Settings";
import OAuthCallback from "./pages/OAuthCallback";
import Events from "./userdashboard/Events";
import HelpCenter from "./userdashboard/HelpCenter";
import Feedback from "./userdashboard/Feedback";
import ResetPassword from "./pages/ResetPassword";
import "remixicon/fonts/remixicon.css";
import HostRegistration from "./userdashboard/HostRegistration"; // ✅ ADDED
import { EventProvider } from "./userdashboard/EventContext";



// ✅ Host dashboard module imports (added)
import {
  HostDashboard,
  HostEvents,
  HostApplications,
  HostAnalytics,
  HostSettings,
} from "./hostdashboard";

// Component to handle OAuth detection and redirection
const OAuthDetector = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if current URL has OAuth token in hash
    const hash = window.location.hash;
    const isOAuthToken = hash.includes('id_token=') || hash.includes('access_token=');
    
    // Prevent redirect loops by checking if we've already processed this
    const redirectProcessed = sessionStorage.getItem('oauth_redirect_processed');
    
    // If we're not on the oauth-callback route but have an OAuth token, redirect
    // Handle both root path and /index.html (common in static hosting)
    const isNonCallbackRoute = location.pathname !== '/oauth-callback' && 
                              location.pathname !== '/oauth-callback.html';
    
    if (isOAuthToken && isNonCallbackRoute && !redirectProcessed) {
      // Mark that we're processing this redirect
      sessionStorage.setItem('oauth_redirect_processed', 'true');
      // Navigate to oauth-callback while preserving the hash
      const redirectUrl = `${window.location.origin}/oauth-callback${hash}`;

      window.location.replace(redirectUrl);
    }
    
    // Clear the redirect flag when we reach the oauth-callback route
    if (location.pathname === '/oauth-callback' && redirectProcessed) {
      sessionStorage.removeItem('oauth_redirect_processed');
    }
  }, [location, navigate]);

  return null; // This component doesn't render anything
};

function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <Router>
          <OAuthDetector />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ProtectedRoute>
                  <HelpCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute>
                  <Feedback />
                </ProtectedRoute>
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />

            {/* Host routes */}
            <Route
              path="/host/registration"
              element={
                <ProtectedRoute>
                  <HostRegistration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/dashboard"
              element={
                <ProtectedRoute>
                  <HostDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/events"
              element={
                <ProtectedRoute>
                  <HostEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/applications"
              element={
                <ProtectedRoute>
                  <HostApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/analytics"
              element={
                <ProtectedRoute>
                  <HostAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/settings"
              element={
                <ProtectedRoute>
                  <HostSettings />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Landing />} />
          </Routes>
        </Router>
      </EventProvider>
    </AuthProvider>
  );
}


export default App;