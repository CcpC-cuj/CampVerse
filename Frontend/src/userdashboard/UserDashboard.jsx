import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../userdashboard/sidebar';
import OnboardingModal from './OnboardingModal';
import { getDashboard, updateMe } from '../api';
import DiscoverEvents from './DiscoverEvents';
import EventHistory from './EventHistory'; 

const UserDashboard = () => {
  const { user, login } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loadingGate, setLoadingGate] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // ✅ For mobile menu
  const [stats, setStats] = useState(null);

  // Unified purple accent to match landing page
  const colorClassMap = {
    blue:   { bg: 'bg-[#9b5de5]/20', text: 'text-[#9b5de5]' }, // was blue → now purple accent
    green:  { bg: 'bg-green-500/20',  text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    purple: { bg: 'bg-[#9b5de5]/20', text: 'text-[#9b5de5]' }, // align purple to same hex
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getDashboard();
        if (!mounted) return;
        const u = data?.user || {};
        
        // Check if onboarding was already completed
        if (u.onboardingCompleted) {
          setShowOnboarding(false);
        } else {
          // Only show onboarding if basic fields or institution are missing
          const basicFieldsFilled = Boolean(u.name && u.phone && u.Gender && u.DOB);
          const hasInstitution = Boolean(u.institutionId);
          setShowOnboarding(!basicFieldsFilled || !hasInstitution);
        }
        
        setStats(data?.stats || null);
      } catch {
        setShowOnboarding(false);
      } finally {
        if (mounted) setLoadingGate(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!user || loadingGate) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
        <div className="text-center">
          {/* Loading spinner */}
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-[#9b5de5] rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          
          {/* Loading text */}
          <h2 className="text-2xl font-semibold mb-2">Welcome to CampVerse</h2>
          <p className="text-white/70 animate-pulse">Loading your dashboard...</p>
          
          {/* Animated dots */}
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-[#9b5de5] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-[#9b5de5] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-[#9b5de5] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">

      {/* ✅ Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ✅ Sidebar */}
      <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 sm:translate-x-0`}>
        <Sidebar />
      </div>

      {/* Main Content (lighter background to distinguish from sidebar) */}
      <div className="flex-1 flex flex-col overflow-hidden sm:pl-0 sm:ml-0 sm:w-full bg-[#141a45]">

        {/* ✅ Top Navigation (aligned; background no longer touches sidebar) */}
        <div className="sticky top-0 z-30 bg-transparent">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-xl px-4 sm:px-6 py-3">

              {/* Hamburger Button (Mobile) */}
              <button
                className="sm:hidden p-2 rounded-lg bg-gray-800/70 text-white transition-transform hover:scale-105"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <i className="ri-menu-line text-lg"></i>
              </button>

              {/* Search Bar (polished alignment) */}
              <div className="relative flex-1 min-w-[220px] max-w-xl">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <i className="ri-search-line text-gray-400 w-5 h-5" />
                </div>
                <input
                  type="text"
                  className="h-11 bg-gray-800/60 border-none text-sm rounded-xl block w-full pl-11 pr-3 text-white placeholder-gray-400 focus:ring-2 focus:ring-[#9b5de5] outline-none"
                  placeholder="Search events, colleges, or categories..."
                />
              </div>

              {/* Right Nav Buttons */}
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
                <button className="bg-gray-800/60 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-all">
                  <i className="ri-notification-3-line" />
                </button>
                <button className="bg-gray-800/60 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80 transition-all">
                  <i className="ri-calendar-line" />
                </button>
                <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button whitespace-nowrap flex items-center gap-2 transition-transform hover:scale-105">
                  <i className="ri-add-line" />
                  <span className="hidden sm:inline">Host Event</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Main Scrollable Area (light background) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-[#141a45]">
          
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-[#9b5de5]/20 to-transparent rounded-lg p-6 mb-6 border border-[#9b5de5]/15">
            <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user.name}!</h1>
            <p className="text-gray-300 mt-1">Ready to explore your next event galaxy?</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="border border-[#9b5de5] text-white px-4 py-2 rounded-button transition-colors hover:bg-[#9b5de5]/20 hover:backdrop-blur-sm">
                Discover Events
              </button>
              <button className="bg-gray-800/60 hover:bg-gray-800/80 text-white px-4 py-2 rounded-button transition-colors">
                View Calendar
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { icon: "ri-calendar-check-fill", color: "blue",   label: "Upcoming Events", count: (stats?.upcomingEvents ?? 0) },
              { icon: "ri-time-fill",           color: "green",  label: "Waitlisted",      count: (stats?.totalWaitlisted ?? 0) },
              { icon: "ri-medal-fill",          color: "yellow", label: "Achievements",    count: (stats?.achievements ?? 0) },
              { icon: "ri-building-2-fill",     color: "purple", label: "My Colleges",     count: (stats?.myColleges ?? (user?.institutionId ? 1 : 0)) },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-800/60 rounded-lg p-4 flex items-center border border-gray-700/40 hover:border-[#9b5de5]/30 transition-colors">
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

          {/* Discover Events */}
          <DiscoverEvents />
          
        </div>
      </div>

      {showOnboarding && (
        <OnboardingModal
          visible={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={async () => {
            try { 
              const response = await updateMe({ onboardingCompleted: true });
              if (response?.user) {
                const token = localStorage.getItem('token');
                if (token) login(token, response.user);
              }
            } catch {}
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;
