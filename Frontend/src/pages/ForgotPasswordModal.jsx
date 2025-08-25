// src/pages/ForgotPasswordModal.jsx
import React, { useState } from "react";
import { forgotPassword } from "../api";

const ForgotPasswordModal = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      if (res.success || res.message) {
        setMessage(res.message || "Reset link sent! Check your email.");
      } else {
        setError(res.error || "Failed to send reset link.");
      }
    } catch {
      setError("Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-8 bg-[rgba(21,23,41,0.92)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
        >
          &times;
        </button>
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-700/30 border border-purple-500">
              <i className="ri-mail-send-line text-3xl text-purple-400" />
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white">Forgot Password?</h2>
          <p className="text-sm text-purple-300">Enter your email to receive a reset link</p>
        </div>
        {error && <div className="text-red-400 text-center mb-2">{error}</div>}
        {message && <div className="text-green-400 text-center mb-2">{message}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            placeholder="Enter your email"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 rounded-lg font-semibold transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
