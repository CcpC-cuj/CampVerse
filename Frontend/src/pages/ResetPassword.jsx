// src/pages/ResetPassword.js
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    // Fallback: if user does not click reset, redirect to landing page after 2 minutes
    const timer = setTimeout(() => {
      navigate("/");
    }, 120000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await resetPassword({ token, password });
      if (!data.error && !data.message?.toLowerCase().includes('invalid')) {
        setMessage("Password reset successful! Redirecting to home...");
        setTimeout(() => navigate("/"), 3000);
      } else {
        setError(data.message || "Invalid or expired link.");
      }
    } catch (err) {
      setError("Something went wrong. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-8 bg-[rgba(21,23,41,0.92)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => navigate("/login")}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-700/30 border border-purple-500">
              <i className="ri-key-2-line text-3xl text-purple-400" />
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white">Reset Your Password</h2>
          <p className="text-sm text-purple-300">Enter your new password below</p>
        </div>

        {error && <div className="text-red-500 text-center mb-2">{error}</div>}
        {message && <div className="text-green-400 text-center mb-2">{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="New Password"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Confirm Password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
