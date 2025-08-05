// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Import pages
import Landing from "./pages/landing";
import UserDashboard from "./pages/UserDashboard";
import OAuthCallback from "./pages/OAuthCallback";
import "remixicon/fonts/remixicon.css";

function App() {
  console.log("🌍 App loaded");

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <UserDashboard />
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
