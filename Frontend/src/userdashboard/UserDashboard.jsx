import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import Sidebar from '../userdashboard/sidebar';
import OnboardingModal from './OnboardingModal';
import { getDashboard, updateMe, getEventRecommendations } from '../api';
import DiscoverEvents from './DiscoverEvents';
import { formatDateShort } from '../utils/dateUtils';
import GradientCircularProgress from "../components/GradientCircularProgress.jsx";
import NavBar from './NavBar.jsx';

const UserDashboard = () => {
  const { user, refreshUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loadingGate, setLoadingGate] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [eventsData, setEventsData] = useState([]);
  const [search, setSearch] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(true);

  const discoverEventsRef = useRef(null);
  const location = useLocation();

  const colorClassMap = {
    blue: { bg: 'bg-[#9b5de5]/20', text: 'text-[#9b5de5]' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    purple: { bg: 'bg-[#9b5de5]/20', text: 'text-[#9b5de5]' },
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getDashboard();
        if (!mounted) return;
        const u = data?.user || {};
        const basicFieldsFilled = Boolean(u.name && u.phone && u.gender && u.dateOfBirth);
        const hasInstitution = Boolean(u.institutionId);
        const shouldShow = !u.onboardingCompleted && (!basicFieldsFilled || !hasInstitution);
        setShowOnboarding(shouldShow);
        setStats(data?.stats || null);

        // 🔹 Prepare events for calendar
        if (data?.events) {
          const formattedEvents = data.events.map(evt => ({
            date: new Date(evt.date).toISOString().split("T")[0],
            type: new Date(evt.date) >= new Date() ? "upcoming" : "past"
          }));
          setEventsData(formattedEvents);
        }
        
        // If you want to refresh user data, call refreshUser() only when needed (e.g., after profile update)
        // Fetch recommendations
        try {
          const recsRes = await getEventRecommendations(3);
          if (recsRes.success) {
            setRecommendations(recsRes.recommendations.map(r => r.event).filter(Boolean));
          }
        } catch (err) {
          console.error("Failed to fetch recommendations:", err);
        } finally {
          setLoadingRecs(false);
        }
        
      } catch {
        setShowOnboarding(false);
      } finally {
        if (mounted) setLoadingGate(false);
      }
    })();
    return () => { mounted = false; };
  }, [refreshUser]);


  // 🔹 Scroll to Discover Events if route matches
  useEffect(() => {
    if (location.pathname === '/dashboard/discover-events' && discoverEventsRef.current) {
      discoverEventsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location]);

  if (!user || loadingGate) {
  return (
    <div className="h-screen flex items-center justify-center  bg-[#141a45]">
      <GradientCircularProgress />
    </div>
  );
}


  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 sm:translate-x-0`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        

        {/* Top Navigation */}
        <NavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={eventsData}
          searchQuery={search}
          setSearchQuery={setSearch}
        />



        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* Welcome & Stats (Home Only) */}
          {location.pathname === '/dashboard' && (
            <>
              {/* Welcome Section */}
              <div className="bg-gradient-to-r from-[#9b5de5]/20 to-transparent rounded-lg p-6 mb-6 border border-[#9b5de5]/15 flex flex-col sm:flex-row justify-between items-center gap-4">
                {/* Text Section */}
                <div className="text-center sm:text-left">
                  <h1 className="text-xl sm:text-2xl font-bold">
                    Welcome back, {user.name}!
                  </h1>
                  <p className="text-gray-300 mt-1">
                    Ready to explore your next event galaxy?
                  </p>
                </div>

                {/* Image Section */}
                <img
                  src="https://readdy.ai/api/search-image?query=3D%20illustration%20of%20a%20space%20theme%20with%20planets%2C%20stars%2C%20and%20a%20rocket%2C%20colorful%2C%20playful%2C%20educational%20theme%2C%20galaxy%20exploration&width=200&height=200&seq=2&orientation=squarish"
                  alt="Space theme"
                  className="w-40 h-40 object-contain relative z-10"
                />
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { icon: 'ri-calendar-check-fill', color: 'blue', label: 'Upcoming Events', count: (stats?.upcomingEvents ?? 0) },
                  { icon: 'ri-time-fill', color: 'green', label: 'Waitlisted', count: (stats?.totalWaitlisted ?? 0) },
                  { icon: 'ri-medal-fill', color: 'yellow', label: 'Achievements', count: (stats?.achievements ?? 0) },
                  { icon: 'ri-building-2-fill', color: 'purple', label: 'My Colleges', count: (stats?.myColleges ?? (user?.institutionId ? 1 : 0)) },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-800/60 rounded-lg p-4 flex items-center border border-gray-700/40 hover:border-[#9b5de5]/30">
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

              {/* Recommendations & Quick Actions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Recommendations Slider/Section */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <i className="ri-magic-line text-[#9b5de5]" />
                      Top Recommendations
                    </h2>
                    <button 
                      onClick={() => window.location.href = '/dashboard/discover-events'}
                      className="text-sm text-[#9b5de5] hover:underline"
                    >
                      See all events
                    </button>
                  </div>
                  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                      <div className="flex flex-col sm:flex-row gap-4">
                    {loadingRecs ? (
                      <div className="flex-1 py-10 flex flex-col items-center justify-center text-gray-500">
                        <div className="w-6 h-6 border-2 border-[#9b5de5] border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-xs">Finding matches...</p>
                      </div>
                    ) : recommendations.length > 0 ? (
                      recommendations.map((event) => (
                        <div 
                          key={event._id}
                          onClick={() => window.location.href = `/events/${event._id}`}
                          className="flex-1 min-w-0 bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 hover:border-[#9b5de5]/50 transition-all cursor-pointer group"
                        >
                          <div className="h-24 bg-gray-800 rounded-md mb-2 overflow-hidden">
                            <img 
                              src={event.bannerURL || event.bannerImage || "/event-placeholder.png"} 
                              alt={event.title} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                            />
                          </div>
                          <h3 className="font-semibold text-white truncate text-sm">{event.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400 truncate">
                              {formatDateShort(event.date).split(',')[0]}
                            </span>
                            <span className="text-[10px] text-gray-400">•</span>
                            <span className="text-[10px] text-gray-400 truncate">
                              {event.location?.venue || event.location?.type || 'TBD'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 py-10 text-center text-gray-500">
                        <p className="text-xs italic">Explore events to get personalized recommendations!</p>
                      </div>
                    )}
                  </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <i className="ri-flashlight-line text-yellow-400" />
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => window.location.href = '/host/manage-events'}
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 p-3 rounded-xl flex items-center gap-3 transition-all"
                    >
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <i className="ri-add-line text-xl" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Host Event</div>
                        <div className="text-[10px] text-white/70">Create a new experience</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => window.location.href = '/dashboard/certificates'}
                      className="w-full bg-gray-800/60 hover:bg-gray-800/80 border border-gray-700 p-3 rounded-xl flex items-center gap-3 transition-all"
                    >
                      <div className="w-10 h-10 bg-[#9b5de5]/20 text-[#9b5de5] rounded-lg flex items-center justify-center">
                        <i className="ri-award-line text-xl" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">View Certificates</div>
                        <div className="text-[10px] text-gray-400">Claim your achievements</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Conditional Discover Events Section (only if specific path) */}
          {location.pathname === '/dashboard/discover-events' && (
            <div ref={discoverEventsRef} className="mt-8">
              <DiscoverEvents />
            </div>
          )}

        </div>
      </div>

      {showOnboarding && (
        <OnboardingModal
          visible={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={async () => {
            try { await updateMe({ onboardingCompleted: true }); } catch (error) { console.error("Onboarding update failed:", error); }
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;
