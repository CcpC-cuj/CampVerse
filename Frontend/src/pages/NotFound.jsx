import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * 404 Not Found Page
 * Displayed when users navigate to a non-existent route
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        {/* 404 Illustration */}
        <div className="relative mb-8">
          <h1 className="text-[150px] sm:text-[200px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 leading-none opacity-20">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-purple-500/10 backdrop-blur-xl flex items-center justify-center border border-purple-500/30">
              <i className="ri-compass-3-line text-6xl text-purple-400"></i>
            </div>
          </div>
        </div>

        {/* Message */}
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Page Not Found
        </h2>
        <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
          Oops! The page you're looking for seems to have wandered off into the cosmos. 
          Let's get you back on track.
        </p>

        {/* Quick Links */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link
            to="/"
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
          >
            <i className="ri-home-line"></i>
            Go to Homepage
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 border border-white/10"
          >
            <i className="ri-arrow-left-line"></i>
            Go Back
          </button>
        </div>

        {/* Helpful Links */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <h3 className="text-white font-semibold mb-4">Looking for something?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              to="/dashboard"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
            >
              <i className="ri-dashboard-line text-2xl text-purple-400 group-hover:text-purple-300"></i>
              <p className="text-sm text-gray-400 mt-1">Dashboard</p>
            </Link>
            <Link
              to="/dashboard/events"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
            >
              <i className="ri-calendar-event-line text-2xl text-pink-400 group-hover:text-pink-300"></i>
              <p className="text-sm text-gray-400 mt-1">Events</p>
            </Link>
            <Link
              to="/help"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
            >
              <i className="ri-question-line text-2xl text-blue-400 group-hover:text-blue-300"></i>
              <p className="text-sm text-gray-400 mt-1">Help</p>
            </Link>
            <Link
              to="/settings"
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
            >
              <i className="ri-settings-3-line text-2xl text-green-400 group-hover:text-green-300"></i>
              <p className="text-sm text-gray-400 mt-1">Settings</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
