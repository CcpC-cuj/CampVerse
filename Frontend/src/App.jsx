import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ModalProvider } from "./components/Modal";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import { ToastProvider } from "./components/Toast";

// Static imports for critical/entry pages
import Landing from "./pages/landing";
import ResetPassword from "./pages/ResetPassword";
import OAuthCallback from "./pages/OAuthCallback";
import AcceptNomination from "./pages/AcceptNomination";
import EventDetailsPage from "./pages/PublicEventDetailsPage";
import "remixicon/fonts/remixicon.css";
import { EventProvider } from "./userdashboard/EventContext";

// Lazy-loaded pages (Dashboards and heavy modules)
const UserDashboard = lazy(() => import("./userdashboard/UserDashboard"));
const Settings = lazy(() => import("./userdashboard/Settings"));
const Events = lazy(() => import("./userdashboard/Events"));
const HelpCenter = lazy(() => import("./userdashboard/HelpCenter"));
const Feedback = lazy(() => import("./userdashboard/Feedback"));
const MyCertificates = lazy(() => import("./userdashboard/MyCertificates"));
const UserBadges = lazy(() => import("./userdashboard/UserBadges"));
const MyInstitution = lazy(() => import("./userdashboard/MyInstitution"));
const HostRegistration = lazy(() => import("./userdashboard/HostRegistration"));
const QRViewer = lazy(() => import("./components/QRViewer"));

// Verifier lazy imports
const VerifierDashboard = lazy(() => import("./verifier/VerifierDashboard"));
const EventVerificationQueue = lazy(() => import("./verifier/EventVerificationQueue"));
const CertificateReview = lazy(() => import("./verifier/CertificateReview"));
const VerifierAnalytics = lazy(() => import("./verifier/VerifierAnalytics"));

// Admin lazy imports
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const UserManagement = lazy(() => import("./admin/UserManagement"));
const InstitutionManagement = lazy(() => import("./admin/InstitutionManagement"));
const PlatformAnalytics = lazy(() => import("./admin/PlatformAnalytics"));
const SystemSettings = lazy(() => import("./admin/SystemSettings"));
const CertificateTemplateManagement = lazy(() => import("./admin/CertificateTemplateManagement"));
const SupportTickets = lazy(() => import("./admin/SupportTickets"));
const FeedbackManagement = lazy(() => import("./admin/FeedbackManagement"));
const AdminTools = lazy(() => import("./admin/AdminTools"));

// Host lazy imports
const ManageEvents = lazy(() => import("./hostdashboard/EventsManagement"));
const HostEventsNew = lazy(() => import("./hostdashboard/HostEventsDashboard"));
const HostAnalytics = lazy(() => import("./hostdashboard/HostAnalytics"));
const QRScanner = lazy(() => import("./hostdashboard/QRScanner"));
const BulkAttendance = lazy(() => import("./hostdashboard/BulkAttendance"));
const AttendanceDashboard = lazy(() => import("./hostdashboard/AttendanceDashboard"));
const CertificateManagement = lazy(() => import("./hostdashboard/CertificateManagementTW"));
const CertificateDesigner = lazy(() => import("./hostdashboard/CertificateDesigner"));
const CreateEventForm = lazy(() => import("./hostdashboard/CreateEventForm"));

// Loading fallback component
const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#141a45] text-white">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
    <p className="text-purple-300 font-medium animate-pulse">Loading CampVerse...</p>
  </div>
);

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
    <ToastProvider>
      <AuthProvider>
        <ModalProvider>
          <EventProvider>
            <Router>
              <ErrorBoundary>
                <OAuthDetector />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  {/* Development-only test route */}
                  {import.meta.env.DEV && (
                    <Route path="/test-create-event" element={<CreateEventForm />} />
                  )}
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
                      <ProtectedRoute requiredRoles={['verifier', 'platformAdmin']}>
                        <VerifierDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/verifier/event-queue"
                    element={
                      <ProtectedRoute requiredRoles={['verifier', 'platformAdmin']}>
                        <EventVerificationQueue />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/verifier/certificate-review"
                    element={
                      <ProtectedRoute requiredRoles={['verifier', 'platformAdmin']}>
                        <CertificateReview />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/verifier/analytics"
                    element={
                      <ProtectedRoute requiredRoles={['verifier', 'platformAdmin']}>
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
                    path="/dashboard/certificates"
                    element={
                      <ProtectedRoute>
                        <MyCertificates />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/badges"
                    element={
                      <ProtectedRoute>
                        <UserBadges />
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
                  <Route
                    path="/colleges"
                    element={
                      <ProtectedRoute>
                        <MyInstitution />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/oauth-callback" element={<OAuthCallback />} />
                  <Route path="/accept-nomination" element={<AcceptNomination />} />
                  
                  {/* Event details route */}
                  <Route path="/events/:id" element={<EventDetailsPage />} />

                  {/* Certificate Designer route */}
                  <Route path="/certificate-designer" element={<CertificateDesigner />} />
                  
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
                  
                  {/* Certificate Management route */}
                  <Route
                    path="/host/events/:eventId/certificates"
                    element={
                      <ProtectedRoute>
                        <CertificateManagement />
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

    
                  {/* ✅ Platform Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <UserManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/institutions"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <InstitutionManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <PlatformAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <SystemSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/certificate-templates"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <CertificateTemplateManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/support"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <SupportTickets />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/feedback"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <FeedbackManagement />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/tools"
                    element={
                      <ProtectedRoute requiredRoles={['platformAdmin']}>
                        <AdminTools />
                      </ProtectedRoute>
                    }
                  />
    
                  {/* 404 Not Found - catch all unmatched routes */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
                </Suspense>
              </ErrorBoundary>
            </Router>
          </EventProvider>
        </ModalProvider>
      </AuthProvider>
    </ToastProvider>
  );
}


export default App;