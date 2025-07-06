// src/pages/SignupModal.jsx
import React, { useState } from "react";

const SignupModal = ({ onClose }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md p-8
                   bg-[rgba(21,23,41,0.85)] border border-purple-600
                   backdrop-blur-lg rounded-2xl shadow-xl
                   overflow-hidden"        // ← ensure no internal scroll
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
        >&times;</button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white">Join CampVerse</h2>
          <p className="text-sm text-purple-300">Find new ideas to try</p>
        </div>

        {/* Form */}
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />

          <input
            type="email"
            placeholder="College Email"
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 pr-10"
              required
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </span>
            <p className="text-xs mt-1 text-purple-300">
              Use 8 or more letters, numbers and symbols
            </p>
          </div>

          <input
            type="date"
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          />

          <select
            className="w-full px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
            required
          >
            <option value="" disabled className="text-gray-400">
              Select Gender
            </option>
            <option className="text-black">Male</option>
            <option className="text-black">Female</option>
            <option className="text-black">Other</option>
            <option className="text-black">Prefer not to say</option>
          </select>

          <button
            type="submit"
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 rounded-full transition"
          >
            Continue
          </button>
        </form>

        {/* Or Divider */}
        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-600" />
          <span className="mx-2 text-gray-400">OR</span>
          <hr className="flex-grow border-gray-600" />
        </div>

        {/* OAuth */}
        <button className="w-full flex items-center justify-center gap-2 border border-white/30 py-2 rounded-full text-white hover:bg-white/10 transition mb-4">
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>

        {/* Footer */}
        <p className="text-xs text-center text-purple-300 mt-4">
          By continuing, you agree to CampVerse’s Terms of Service and Privacy Policy.
        </p>

        {/* Updated contrast here: */}
        <p className="text-sm text-center mt-3 text-purple-400">
          Already a member?{" "}
          <span
            onClick={() => {
              onClose();
            }}
            className="hover:underline cursor-pointer text-white"
          >
            Log In
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignupModal;
