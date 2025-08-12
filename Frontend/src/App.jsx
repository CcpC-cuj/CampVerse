// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Import pages
import Landing from "./pages/landing";
import UserDashboard from "./userdashboard/UserDashboard";
import Settings from "./userdashboard/Settings";
import OAuthCallback from "./pages/OAuthCallback";
import EventHistory from "./userdashboard/EventHistory";
import HelpCenter from "./userdashboard/HelpCenter"; // already added earlier
import Feedback from "./userdashboard/Feedback";     // ← NEW
import "remixicon/fonts/remixicon.css";

function App() {
  return (
    <AuthProvider>
      <Router>
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
          {/* New route for Event History */}
          <Route
            path="/eventhistory"
            element={
              <ProtectedRoute>
                <EventHistory />
              </ProtectedRoute>
            }
          />
          {/* Help Center route */}
          <Route
            path="/help"
            element={
              <ProtectedRoute>
                <HelpCenter />
              </ProtectedRoute>
            }
          />
          {/* NEW: Feedback route */}
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
