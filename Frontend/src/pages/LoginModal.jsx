// src/pages/LoginModal.jsx
import React, { useState, useEffect } from "react";
import { googleSignIn, login } from "../api";
import { initializeGoogleAuth, getGoogleToken } from "../utils/googleAuth";
import { useAuth } from "../contexts/AuthContext";

const LoginModal = ({ onClose, onSwitchToSignup, onForgotPassword }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login: authLogin, logout: authLogout } = useAuth();
  const [forceLogout, setForceLogout] = useState(false);

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
    try {
      setIsLoading(true);
      const response = await login(formData);
      
      if (response.token) {
        authLogin(response.token, response.user);
        onClose();
        // No redirect: stay on current page so event view updates with authentication
      } else {
  // ...existing code...
      }
    } catch (error) {
      console.error('Login error:', error);
  // ...existing code...
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setForceLogout(false);
    // Store current route for post-auth redirect
    sessionStorage.setItem('postAuthRedirect', window.location.pathname + window.location.search + window.location.hash);
    try {
      setIsLoading(true);
      const token = await getGoogleToken();
      const response = await googleSignIn({ token });

      if (response.token) {
        authLogin(response.token, response.user);
        onClose();
        // No redirect: stay on current page so event view updates with authentication
      } else if (response.error) {
        if (response.forceLogout) {
          authLogout();
          setForceLogout(true);
        }
        if (response.error.includes("academic emails")) {
          setError("Please use your institute email (ending with .ac.in or .edu.in) to sign in.");
        } else {
          setError(response.error);
        }
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } catch (error) {
      setError("Google sign-in failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="text-sm text-purple-300">Log in to continue</p>
        </div>

        {error && (
          <div className="text-red-500 text-center mb-2">
            {error}
            {forceLogout && (
              <button
                className="ml-2 underline text-purple-400 hover:text-purple-600"
                onClick={() => { authLogout(); onClose(); }}
              >
                Logout
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="College Email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
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
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  className="text-purple-400 hover:text-purple-300 text-sm underline"
                  onClick={typeof onForgotPassword === 'function' ? onForgotPassword : undefined}
                >
                  Forgot Password?
                </button>
              </div>

        {/* Or divider */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-600" />
          <span className="mx-2 text-gray-400">OR</span>
          <hr className="flex-grow border-gray-600" />
        </div>

        {/* OAuth Buttons */}
        <button 
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 border border-white/30 py-2 rounded-full text-white hover:bg-white/10 transition mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          {isLoading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Footer */}
        <p className="text-xs text-center text-purple-300 mt-4">
          Not a member?{" "}
          <span
            onClick={() => {
              onClose();
              onSwitchToSignup(); // ← Switch to Signup modal
            }}
            className="text-white hover:underline cursor-pointer"
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
