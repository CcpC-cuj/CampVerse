import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../userdashboard/sidebar';
import OnboardingModal from './OnboardingModal';
import { getDashboard, updateMe } from '../api';

const UserDashboard = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loadingGate, setLoadingGate] = useState(true);

  // Color mapping for Tailwind classes to avoid dynamic class issues
  const colorClassMap = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getDashboard();
        if (!mounted) return;
        const u = data?.user || {};
        if (u.onboardingCompleted) {
          setShowOnboarding(false);
        } else {
          const basicFieldsFilled = Boolean(u.name && u.phone && u.Gender && u.DOB);
          const hasInstitution = Boolean(u.institutionId);
          const needsOnboarding = !basicFieldsFilled || !hasInstitution;
          setShowOnboarding(needsOnboarding);
        }
      } catch {
        setShowOnboarding(false);
      } finally {
        if (mounted) setLoadingGate(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!user || loadingGate) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full sm:w-auto sm:flex-1 min-w-[250px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="ri-search-line text-gray-400 w-5 h-5" />
            </div>
            <input
              type="text"
              className="bg-gray-700 border-none text-sm rounded-lg block w-full pl-10 p-2.5 text-white placeholder-gray-400 focus:ring-2 focus:ring-primary outline-none"
              placeholder="Search events, colleges, or categories..."
            />
          </div>

          {/* Right Nav Buttons */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end w-full sm:w-auto">
            <button className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-white transition-colors">
              <i className="ri-notification-3-line w-5 h-5" />
            </button>
            <button className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-white transition-colors">
              <i className="ri-calendar-line w-5 h-5" />
            </button>
            <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-button whitespace-nowrap flex items-center gap-2 transition-colors">
              <i className="ri-add-line w-5 h-5" />
              <span className="hidden sm:inline">Host Event</span>
            </button>
          </div>
        </div>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-900">
          {/* ✅ Get Started / Welcome Section */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user.name}!</h1>
                <p className="text-gray-300 mt-1">Ready to explore your next event galaxy?</p>
                <div className="mt-4 flex gap-3">
                  <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-button whitespace-nowrap transition-colors">
                    Discover Events
                  </button>
                  <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-button whitespace-nowrap transition-colors">
                    View Calendar
                  </button>
                </div>
              </div>
              <div className="hidden md:block relative">
                <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />
                <img
                  src="https://readdy.ai/api/search-image?query=3D%20illustration%20of%20a%20space%20theme%20with%20planets%2C%20stars%2C%20and%20a%20rocket%2C%20colorful%2C%20playful%2C%20educational%20theme%2C%20galaxy%20exploration&width=200&height=200&seq=2&orientation=squarish"
                  alt="Space theme"
                  className="w-40 h-40 object-contain relative z-10"
                  onError={(e) => { 
                    e.currentTarget.onerror = null; 
                    e.currentTarget.src = "/images/space-theme-fallback.svg"; 
                  }}
                />
              </div>
            </div>
          </div>

          {/* 🔢 Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { icon: "ri-calendar-check-fill", color: "blue", label: "Upcoming Events", count: 5 },
              { icon: "ri-time-fill", color: "green", label: "Waitlisted", count: 2 },
              { icon: "ri-medal-fill", color: "yellow", label: "Achievements", count: 7 },
              { icon: "ri-building-2-fill", color: "purple", label: "My Colleges", count: 3 },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-gray-800 rounded-lg p-4 flex items-center"
              >
                <div className={`w-12 h-12 rounded-lg ${colorClassMap[stat.color].bg} flex items-center justify-center ${colorClassMap[stat.color].text} mr-4`}>
                  <i className={`${stat.icon} ri-lg`} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                  <div className="text-xl font-bold">{stat.count}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {showOnboarding && (
        <OnboardingModal
          visible={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={async () => {
            try { await updateMe({ onboardingCompleted: true }); } catch {}
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;
