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
        alert(`OTP sent to your email.`);
        onClose();
        onSignupSuccess(formData.email);
      } else {
        setError(response.error || "Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Registration failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    try {
      setIsLoading(true);
      const token = await getGoogleToken();
      const response = await googleSignIn({ token });

      if (response.token) {
        authLogin(response.token, response.user);
        onClose();
        window.location.href = "/dashboard";
      } else if (response.error) {
        if (response.error.includes("academic emails")) {
          setError("Please use your institute email (ending with .ac.in or .edu.in).");
        } else {
          setError(response.error);
        }
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } catch (err) {
      setError("Google sign-in failed: " + err.message);
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
          <p className="text-sm text-purple-300">Find new ideas to try</p>
        </div>

        {error && <div className="text-red-500 text-center mb-2">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />

          <input
            name="email"
            type="email"
            placeholder="College Email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />

          <input
            name="phone"
            type="tel"
            placeholder="Phone Number"
            value={formData.phone}
            onChange={handleInputChange}
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />

          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 pr-10"
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Account..." : "Continue"}
          </button>
        </form>

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
