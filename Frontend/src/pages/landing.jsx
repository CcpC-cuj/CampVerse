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
              if (res.token) {
                alert('Email verified successfully!');
                setShowOtp(false);
                window.location.href = '/dashboard';
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
