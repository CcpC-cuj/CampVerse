import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Import pages
import Landing from "./pages/landing";
import UserDashboard from "./userdashboard/UserDashboard";
import Settings from "./userdashboard/Settings";
import OAuthCallback from "./pages/OAuthCallback";
import EventHistory from "./userdashboard/EventHistory";
import HelpCenter from "./userdashboard/HelpCenter";
import Feedback from "./userdashboard/Feedback";
import "remixicon/fonts/remixicon.css";

// Component to handle OAuth detection and redirection
const OAuthDetector = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if current URL has OAuth token in hash
    const hash = window.location.hash;
    const isOAuthToken = hash.includes('id_token=') || hash.includes('access_token=');
    
    // If we're not on the oauth-callback route but have an OAuth token, redirect
    if (isOAuthToken && location.pathname !== '/oauth-callback') {
      console.log("🔵 [OAUTH DETECTOR] OAuth token detected on non-callback route, redirecting...");
      console.log("🔵 [OAUTH DETECTOR] Current path:", location.pathname);
      console.log("🔵 [OAUTH DETECTOR] Hash contains token:", !!isOAuthToken);
      
      // Navigate to oauth-callback while preserving the hash
      navigate('/oauth-callback', { replace: true });
    }
  }, [location, navigate]);

  return null; // This component doesn't render anything
};

function App() {
  useEffect(() => {
    console.log("API URL from env:", import.meta.env.VITE_API_URL);
  }, []);

  return (
    <AuthProvider>
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
            path="/eventhistory"
            element={
              <ProtectedRoute>
                <EventHistory />
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
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
