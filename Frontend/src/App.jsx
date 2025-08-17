import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
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

function App() {
  useEffect(() => {
    console.log("API URL from env:", import.meta.env.VITE_API_URL);
  }, []);

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
