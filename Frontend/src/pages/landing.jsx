// src/pages/landing.jsx
import React, { useState } from "react";
import StarryBackground from "../landing/StarryBackground";
import Navbar from "../landing/navbar";
import Hero from "../landing/hero";
import LoginModal from "./LoginModal";
import SignupModal from "./SignupModal";
import DashboardPreview from "../landing/dashboard";
import Testimonials from "../landing/testimonial";
import FaqCta from "../landing/faq";
import Footer from "../landing/footer";
import FeaturesSection from "../landing/features";

const Landing = () => {
  // Both start closed
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

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

      {/* Pass the signup-trigger into Hero */}
      <Hero
        onSignupClick={() => {
          setShowLogin(false);
          setShowSignup(true);
        }}
      />

      <FeaturesSection/>
      <DashboardPreview />
      <Testimonials />
      <FaqCta />
      <Footer />

      {/* Show modals with switching logic */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSwitchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
        />
      )}

      {showSignup && (
        <SignupModal
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
        />
      )}
    </div>
  );
};

export default Landing;
