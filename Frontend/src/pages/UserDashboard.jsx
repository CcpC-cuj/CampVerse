import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">CampVerse</h1>
              <span className="text-purple-300">Dashboard</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user.name}</span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-purple-500/30">
          <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">Name</label>
              <p className="text-white text-lg">{user.name}</p>
            </div>
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">Email</label>
              <p className="text-white text-lg">{user.email}</p>
            </div>
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">Phone</label>
              <p className="text-white text-lg">{user.phone}</p>
            </div>
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">Role</label>
              <p className="text-white text-lg capitalize">{user.roles?.join(', ') || 'Student'}</p>
            </div>
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">Verified</label>
              <p className="text-white text-lg">{user.isVerified ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">Can Host</label>
              <p className="text-white text-lg">{user.canHost ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center">
              <div className="p-2 bg-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-300 text-sm">Certificates</p>
                <p className="text-white text-2xl font-bold">{user.badges?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-300 text-sm">Achievements</p>
                <p className="text-white text-2xl font-bold">{user.badges?.length || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-purple-300 text-sm">Events</p>
                <p className="text-white text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
          <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="text-sm">Join Event</span>
              </div>
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg transition-colors">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm">View Certificates</span>
              </div>
            </button>
            <button className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg transition-colors">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm">Edit Profile</span>
              </div>
            </button>
            <button className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-lg transition-colors">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Help & Support</span>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard; 
