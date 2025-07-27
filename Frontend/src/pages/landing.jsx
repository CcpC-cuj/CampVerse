// src/pages/landing.jsx
import React, { useState } from "react";
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

const Landing = () => {
  // Control which popup is visible
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  // NEW: State for OTP modal
  const [showOtp, setShowOtp] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

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

      <Hero
        onSignupClick={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />

      <FeaturesSection />
      <DashboardPreview />
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
          onVerifyOtp={(code) => {
            // call your verify-OTP API with (otpEmail, code)
            // on success: navigate to dashboard or show success
          }}
          onResendOtp={() => {
            // call your resend-OTP API with otpEmail
          }}
        />
      )}
    </div>
  );
};

export default Landing;
