import { CreateEventForm } from "./hostdashboard";
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
import EventDetailsPage from "./pages/PublicEventDetailsPage";
import QRViewer from "./components/QRViewer";
import "remixicon/fonts/remixicon.css";
import HostRegistration from "./userdashboard/HostRegistration"; // ✅ ADDED
import { EventProvider } from "./userdashboard/EventContext";
import VerifierDashboard from "./verifier/VerifierDashboard";
import EventVerificationQueue from "./verifier/EventVerificationQueue";
import CertificateReview from "./verifier/CertificateReview";
import VerifierAnalytics from "./verifier/VerifierAnalytics";



// ✅ Host dashboard module imports (updated)
import {
  ManageEvents,
  HostEventsNew,
  HostApplications,
  HostAnalytics,
  HostSettings,
  QRScanner,
  BulkAttendance,
  AttendanceDashboard,
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
            {/* Test route for event creation */}
            <Route path="/test-create-event" element={<CreateEventForm />} />
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
              path="/verifier/dashboard"
              element={
                <ProtectedRoute>
                  <VerifierDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verifier/event-queue"
              element={
                <ProtectedRoute>
                  <EventVerificationQueue />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verifier/certificate-review"
              element={
                <ProtectedRoute>
                  <CertificateReview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/verifier/analytics"
              element={
                <ProtectedRoute>
                  <VerifierAnalytics />
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
            
            {/* Event details route */}
            <Route path="/events/:id" element={<EventDetailsPage />} />
            
            {/* QR Code viewer route */}
            <Route 
              path="/events/:id/qr" 
              element={
                <ProtectedRoute>
                  <QRViewer />
                </ProtectedRoute>
              } 
            />

            {/* Host routes */}
            <Route
              path="/host/registration"
              element={
                <ProtectedRoute>
                  <HostRegistration />
                </ProtectedRoute>
              }
            />
            {/* Consolidated ManageEvents route */}
            <Route
              path="/host/manage-events"
              element={
                <ProtectedRoute>
                  <ManageEvents />
                </ProtectedRoute>
              }
            />
            {/* Legacy route redirects */}
            <Route
              path="/host/dashboard"
              element={
                <ProtectedRoute>
                  <ManageEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/events"
              element={
                <ProtectedRoute>
                  <ManageEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host/events-new"
              element={
                <ProtectedRoute>
                  <HostEventsNew />
                </ProtectedRoute>
              }
            />
            
            {/* QR Scanner route */}
            <Route
              path="/host/events/:eventId/qr-scanner"
              element={
                <ProtectedRoute>
                  <QRScanner />
                </ProtectedRoute>
              }
            />
            
            {/* Attendance Dashboard route */}
            <Route
              path="/host/events/:eventId/attendance"
              element={
                <ProtectedRoute>
                  <AttendanceDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Bulk Attendance route */}
            <Route
              path="/host/events/:eventId/bulk-attendance"
              element={
                <ProtectedRoute>
                  <BulkAttendance />
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