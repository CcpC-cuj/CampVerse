import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../userdashboard/sidebar';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <div className="text-white p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Mobile Toggle Button */}
      <div className="md:hidden flex justify-between items-center p-4 bg-black/20 border-b border-purple-500/30">
        <h1 className="text-xl font-bold text-white">CampVerse</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white text-2xl">
          <i className="ri-menu-line"></i>
        </button>
      </div>

      {/* Sidebar (Hidden on mobile unless open) */}
      <div
        className={`fixed md:static z-40 top-0 left-0 h-full w-64 bg-gray-900 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <Sidebar />
      </div>

      {/* Overlay when sidebar is open (on mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Dashboard Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-lg border-b border-purple-500/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="hidden md:flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-white">CampVerse</h1>
                <span className="text-purple-300">Dashboard</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-white text-sm sm:text-base">Welcome, {user.name}</span>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Profile Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-purple-500/30">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Profile Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Name</label>
                <p className="text-white text-base sm:text-lg">{user.name}</p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Email</label>
                <p className="text-white text-base sm:text-lg">{user.email}</p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Phone</label>
                <p className="text-white text-base sm:text-lg">{user.phone}</p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Role</label>
                <p className="text-white text-base sm:text-lg capitalize">{user.roles?.join(', ') || 'Student'}</p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Verified</label>
                <p className="text-white text-base sm:text-lg">{user.isVerified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-1">Can Host</label>
                <p className="text-white text-base sm:text-lg">{user.canHost ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;
