// src/pages/SignupModal.jsx
import React, { useState, useEffect } from "react";
import { googleSignIn, register } from "../api";
import { initializeGoogleAuth, getGoogleToken } from "../utils/googleAuth";
import { useAuth } from "../contexts/AuthContext";

const SignupModal = ({
  onClose,
  onSwitchToLogin,
  onSignupSuccess // ← New prop for OTP
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [error, setError] = useState("");
  const { login: authLogin } = useAuth();

  useEffect(() => {
    initializeGoogleAuth();
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    // Password validation (must match backend)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError("Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.");
      return;
    }
    try {
      setIsLoading(true);
      const response = await register(formData);
      if (response.message) {
        // Registration successful, trigger OTP flow
        onClose();
        onSignupSuccess(formData.email);
        // No redirect: stay on current page so event view updates with authentication
      } else {
        setError(response.error || "Registration failed");
      }
    } catch (err) {
      setError("Registration failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    // Store current route for post-auth redirect
    sessionStorage.setItem('postAuthRedirect', window.location.pathname + window.location.search + window.location.hash);
    // Start Google OAuth flow; only initiation errors are handled here.
    // The actual OAuth response will be processed by /oauth-callback.
    try {
      await getGoogleToken();
      // No redirect: stay on current page so event view updates with authentication
    } catch (err) {
      setError("Failed to initiate Google sign-in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white">Join CampVerse</h2>
          <p className="text-sm text-purple-300">Create your account to get started</p>
        </div>

        {error && <div className="text-red-500 text-center mb-2">{error}</div>}

        {/* Form */}
          {/* Maintenance message and disabled form */}
          <div className="space-y-4">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg text-center mb-2">
              <strong>Server under maintenance:</strong> Email/password signup is temporarily unavailable.<br />
              Please use Google login to sign up.
            </div>
            <input
              name="name"
              type="text"
              placeholder="Full Name"
              value={formData.name}
              disabled
              className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 opacity-50 cursor-not-allowed"
            />
            <input
              name="email"
              type="email"
              placeholder="College Email"
              value={formData.email}
              disabled
              className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 opacity-50 cursor-not-allowed"
            />
            <input
              name="phone"
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              disabled
              className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 opacity-50 cursor-not-allowed"
            />
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                disabled
                className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 opacity-50 cursor-not-allowed pr-10"
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 cursor-not-allowed"
              >
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>
            <button
              type="submit"
              disabled
              className="w-full bg-purple-700 text-white font-semibold py-2 rounded-full transition hover:bg-purple-600 opacity-50 cursor-not-allowed"
            >
              Server under maintenance
            </button>
          </div>

        {/* Or Divider */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-600" />
          <span className="mx-2 text-gray-400">OR</span>
          <hr className="flex-grow border-gray-600" />
        </div>

        {/* OAuth */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 border border-white/30 py-2 rounded-full text-white hover:bg-white/10 transition mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          {isLoading ? "Signing in..." : "Continue with Google"}
        </button>

        {/* Terms */}
        <p className="text-xs text-center text-purple-300 mt-4">
          By continuing, you agree to CampVerse’s Terms of Service and Privacy Policy.
        </p>

        {/* Footer */}
        <p className="text-sm text-center mt-3 text-purple-400">
          Already a member?{" "}
          <span
            onClick={() => {
              onClose();
              onSwitchToLogin();
            }}
            className="hover:underline cursor-pointer text-white"
          >
            Log In
          </span>
        </p>
      </div>
    </div>
);
}
export default SignupModal;
