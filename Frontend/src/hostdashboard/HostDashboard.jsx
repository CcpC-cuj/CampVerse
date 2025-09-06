import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getHostDashboard, getMyEvents } from "../api/host";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import HostEventCard from "./HostEventCard";

const HostDashboard = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading host dashboard data...");

        // Try to load dashboard stats
        let dashboardData = null;
        try {
          dashboardData = await getHostDashboard();
          console.log("Dashboard data:", dashboardData);
        } catch (dashboardError) {
          console.error("Dashboard API failed:", dashboardError);
        }

        // Load events separately
        let eventsData = [];
        try {
          eventsData = await getMyEvents();
          console.log("Events data:", eventsData);
          
          if (Array.isArray(eventsData)) {
            eventsData = eventsData;
          } else if (eventsData && eventsData.events) {
            eventsData = eventsData.events;
          } else {
            eventsData = [];
          }
        } catch (eventsError) {
          console.error("Events API failed:", eventsError);
          eventsData = [];
        }

        if (!mounted) return;

        // Set stats from dashboard API or calculate from events
        if (dashboardData && !dashboardData.error) {
          setStats({
            activeEvents: dashboardData.totalEvents || eventsData.length,
            totalRegistrations: dashboardData.totalParticipants || 0,
            pendingApprovals: dashboardData.pendingApprovals || 0,
            revenue: `₹${(dashboardData.totalRevenue || 0).toLocaleString()}`,
          });
        } else {
          // Calculate stats from events data
          const activeEvents = eventsData.filter(e => 
            e.verificationStatus === 'approved' || e.verificationStatus === 'pending'
          ).length;
          const totalRegistrations = eventsData.reduce((sum, e) => 
            sum + (e.participants?.length || 0), 0
          );
          
          setStats({
            activeEvents,
            totalRegistrations,
            pendingApprovals: eventsData.filter(e => e.verificationStatus === 'pending').length,
            revenue: "₹0",
          });
        }

        // Transform events data for display
        const transformedEvents = eventsData.map(event => ({
          id: event._id,
          title: event.title,
          date: event.schedule?.start || event.createdAt,
          status: getEventStatus(event),
          registrations: event.participants?.length || 0,
          cover: event.logoURL || event.bannerURL || "/placeholder-event.jpg",
          verificationStatus: event.verificationStatus,
        }));

        setEvents(transformedEvents);
        
      } catch (error) {
        console.error("Error loading dashboard:", error);
        setError("Failed to load dashboard data");
        
        // Set empty state
        if (mounted) {
          setStats({
            activeEvents: 0,
            totalRegistrations: 0,
            pendingApprovals: 0,
            revenue: "₹0",
          });
          setEvents([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboardData();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Helper function to determine event status
  const getEventStatus = (event) => {
    if (event.verificationStatus === 'pending') return 'Draft';
    if (event.verificationStatus === 'rejected') return 'Rejected';
    
    const now = new Date();
    const eventDate = new Date(event.schedule?.start || event.createdAt);
    
    if (eventDate > now) return 'Upcoming';
    if (eventDate < now) return 'Past';
    return 'Live';
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
          <p className="text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <i className="ri-error-warning-line text-4xl text-red-400" />
          <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
          <p className="text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0`}
      >
        <HostSidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={events}
          searchQuery={""}
          setSearchQuery={() => {}}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-[#9b5de5]/20 to-transparent rounded-lg p-6 mb-6 border border-[#9b5de5]/15 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold">
                Host Dashboard{user?.name ? ` — Hi, ${user.name}!` : ""}
              </h1>
              <p className="text-gray-300 mt-1">
                Manage events, approvals, and analytics in one place.
              </p>
            </div>
            <img
              src="https://readdy.ai/api/search-image?query=3D%20dashboard%20host%20galaxy%20purple&width=220&height=180&seq=3&orientation=squarish"
              alt="Host"
              className="w-40 h-36 object-contain"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              {
                icon: "ri-broadcast-fill",
                label: "Active Events",
                value: stats?.activeEvents ?? 0,
                bg: "bg-[#9b5de5]/20",
                text: "text-[#d9c4ff]",
              },
              {
                icon: "ri-team-fill",
                label: "Total Registrations",
                value: stats?.totalRegistrations ?? 0,
                bg: "bg-green-500/20",
                text: "text-green-400",
              },
              {
                icon: "ri-time-fill",
                label: "Pending Approvals",
                value: stats?.pendingApprovals ?? 0,
                bg: "bg-amber-500/20",
                text: "text-amber-400",
              },
              {
                icon: "ri-bank-card-2-fill",
                label: "Revenue",
                value: stats?.revenue ?? "₹0",
                bg: "bg-blue-500/20",
                text: "text-blue-400",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-gray-800/60 rounded-lg p-4 flex items-center border border-gray-700/40 hover:border-[#9b5de5]/30"
              >
                <div
                  className={`w-12 h-12 rounded-lg ${s.bg} flex items-center justify-center ${s.text} mr-4`}
                >
                  <i className={`${s.icon} ri-lg`} />
                </div>
                <div>
                  <div className="text-sm text-gray-400">{s.label}</div>
                  <div className="text-xl font-bold">{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Events list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">Your Events</h2>
              <button
                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button flex items-center gap-2"
                onClick={() => (window.location.href = "/host/events")}
              >
                <i className="ri-add-line" />
                Create / Manage
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {events.map((e) => (
                <HostEventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;
