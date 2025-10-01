// src/pages/landing.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { googleSignIn } from "../api";
import StarryBackground from "../landing/StarryBackground";
import Navbar from "../landing/navbar";
import Hero from "../landing/hero";
import LoginModal from "./LoginModal";
import SignupModal from "./SignupModal";
import OtpModal from "./OtpModal";               // ← New import
import DashboardPreview from "../landing/dashboard";
import Testimonials from "../landing/testimonial";
import FaqCta from "../landing/faq";
import Footer from "../landing/footer";
import FeaturesSection from "../landing/features";
import ForgotPasswordModal from "./ForgotPasswordModal";

const Landing = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);
  
  // Control which popup is visible
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // NEW: State for OTP modal
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // OAuth handling directly in landing page as fallback
  useEffect(() => {
    const handleOAuthToken = async () => {
      const hash = window.location.hash;
      const isOAuthToken = hash.includes('id_token=') || hash.includes('access_token=');
      
      if (isOAuthToken) {
        
        try {
          // Extract token from hash
          const params = new URLSearchParams(hash.substring(1));
          const idToken = params.get('id_token');
          const accessToken = params.get('access_token');
          const oauthToken = idToken || accessToken;
          
          if (oauthToken) {
            const response = await googleSignIn({ token: oauthToken });
            
            if (response.token) {
              login(response.token, response.user);
              // Clear the hash and redirect
              window.location.hash = '';
              navigate('/dashboard');
            } else {
              console.error("🔴 [LANDING] OAuth response error:", response.error);
            }
          }
        } catch (error) {
          console.error("🔴 [LANDING] OAuth processing error:", error);
        }
      }
    };

    handleOAuthToken();
  }, [login, navigate]);

  return (
    <div>
      <StarryBackground />

      <Navbar
        onLoginClick={() => {
          setShowSignup(false);
          setShowLogin(true);
        }}
        onSignupClick={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />

      {/* Expose "Home" anchor for nav/footer */}
      <Hero
        onSignupClick={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />

      <FeaturesSection />

      {/* Expose "Events" anchor for nav/footer without changing DashboardPreview */}
      <section id="events">
        <DashboardPreview />
      </section>

      <Testimonials />
      <FaqCta />
      <Footer />

      {/* Login Modal (unchanged) */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSwitchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
          onForgotPassword={() => {
            setShowLogin(false);
            setShowForgotPassword(true);
          }}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
        />
      )}

      {/* Signup Modal, now triggers OTP on success */}
      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
          // NEW: Called by SignupModal after successful signup
          onSignupSuccess={(email) => {
            setOtpEmail(email);
            setShowSignup(false);
            setShowOtp(true);
          }}
        />
      )}

      {/* OTP Verification Modal */}
      {showOtp && (
        <OtpModal
          email={otpEmail}
          onClose={() => setShowOtp(false)}
          onVerifyOtp={async (code) => {
            // Call verifyOtp API
            try {
              const res = await import('../api').then(m => m.verifyOtp({ email: otpEmail, otp: code }));
              if (res.token && res.user) {
                // Update AuthContext state
                login(res.token, res.user);
                alert('Email verified successfully!');
                setShowOtp(false);
                // Use navigate instead of window.location.href for better routing
                navigate('/dashboard');
              } else {
                alert(res.error || 'OTP verification failed.');
              }
            } catch (err) {
              alert('Error verifying OTP: ' + err.message);
            }
          }}
          onResendOtp={async () => {
            try {
              const res = await import('../api').then(m => m.resendOtp({ email: otpEmail }));
              if (res.message) {
                alert('OTP resent to your email.');
                // The timer reset is handled inside OtpModal via setTimer(30)
              } else {
                alert(res.error || 'Failed to resend OTP.');
              }
            } catch (err) {
              alert('Error resending OTP: ' + err.message);
            }
          }}
        />
      )}
    </div>
  );
};

export default Landing;
