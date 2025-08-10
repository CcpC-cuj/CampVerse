import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../userdashboard/sidebar';
import OnboardingModal from './OnboardingModal';
import { getDashboard, updateMe } from '../api';
import DiscoverEvents from './DiscoverEvents';

const UserDashboard = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loadingGate, setLoadingGate] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // ✅ For mobile menu

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
        const basicFieldsFilled = Boolean(u.name && u.phone && u.Gender && u.DOB);
        const hasInstitution = Boolean(u.institutionId);
        setShowOnboarding(!basicFieldsFilled || !hasInstitution);
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden sm:pl-0 sm:ml-0 sm:w-full">

        {/* ✅ Top Navigation */}
        <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
          
          {/* Hamburger Button (Mobile) */}
          <button
            className="sm:hidden p-2 rounded-lg bg-gray-700 text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <i className="ri-menu-line text-lg"></i>
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
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
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
            <button className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-white transition-colors">
              <i className="ri-notification-3-line" />
            </button>
            <button className="bg-gray-700 p-2 rounded-lg text-gray-300 hover:text-white transition-colors">
              <i className="ri-calendar-line" />
            </button>
            <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-button whitespace-nowrap flex items-center gap-2 transition-colors">
              <i className="ri-add-line" />
              <span className="hidden sm:inline">Host Event</span>
            </button>
          </div>
        </div>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-gray-900">
          
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user.name}!</h1>
            <p className="text-gray-300 mt-1">Ready to explore your next event galaxy?</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-button transition-colors">
                Discover Events
              </button>
              <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-button transition-colors">
                View Calendar
              </button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { icon: "ri-calendar-check-fill", color: "blue", label: "Upcoming Events", count: 5 },
              { icon: "ri-time-fill", color: "green", label: "Waitlisted", count: 2 },
              { icon: "ri-medal-fill", color: "yellow", label: "Achievements", count: 7 },
              { icon: "ri-building-2-fill", color: "purple", label: "My Colleges", count: 3 },
            ].map((stat, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-4 flex items-center">
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
            try { await updateMe({ onboardingCompleted: true }); } catch {}
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;
