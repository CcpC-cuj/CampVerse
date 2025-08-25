import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * HostRegistrationModal
 * - Visual style aligned with src/pages/LoginModal.jsx
 * - Only UI/colors changed; behavior/props unchanged
 */
const HostRegistrationModal = ({ open, onClose, defaultEmail = "" }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(defaultEmail);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail || "");
      setError("");
    }
  }, [open, defaultEmail]);

  if (!open) return null;

  const validEmail = (val) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val || "").trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validEmail(email)) {
      setError("Please enter a valid email.");
      return;
    }
    navigate(`/host/registration?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Card */}
      <div className="relative w-[95%] max-w-md p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white">Become a Host</h2>
          <p className="text-sm text-purple-300">Enter your email to start host registration</p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-500 text-center mb-2 text-sm">{error}</div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-gray-300">
            Email
            <input
              type="email"
              value={email}
              placeholder="you@college.ac.in"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-white/30 text-white hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-full bg-purple-700 hover:bg-purple-800 text-white font-semibold transition"
            >
              Continue
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <p className="text-xs text-center text-purple-300 mt-4">
          You’ll be redirected to the Host Registration page next.
        </p>
      </div>
    </div>
  );
};

export default HostRegistrationModal;
