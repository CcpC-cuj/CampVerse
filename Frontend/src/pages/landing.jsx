// src/pages/landing.jsx
import React, { useState } from "react";
import StarryBackground from "../landing/StarryBackground";
import Navbar from "../landing/navbar";
import Hero from "../landing/hero";
import LoginModal from "./LoginModal";
import SignupModal from "./SignupModal";

const Landing = () => {
  // ← initialize both to false so no modal shows on load
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
      <Hero />

      {/* Render modals only when their flag is true */}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
    </div>
  );
};

export default Landing;
