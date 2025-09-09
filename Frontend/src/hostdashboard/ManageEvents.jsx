import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getHostDashboard, getMyEvents } from "../api/host";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import HostEventCard from "./HostEventCard";

const ManageEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [viewMode, setViewMode] = useState("dashboard"); // "dashboard" or "manage"

  useEffect(() => {
    let mounted = true;
    
    const loadEventsData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading host events data...");

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
          // Check if it's a 403 or role-related error
          if (eventsError.message?.includes('403') || eventsError.message?.includes('Forbidden')) {
            setError("You don't have host permissions. Please complete your host registration first.");
          } else {
            setError("Failed to load events. Please try again.");
          }
          eventsData = [];
        }

        if (!mounted) return;

        // Transform events data for display
        const transformedEvents = eventsData.map(event => ({
          ...event,
          id: event._id,
          title: event.title,
          date: event.schedule?.start || event.createdAt,
          status: getEventStatus(event),
          registrations: event.participants?.length || 0,
          cover: event.logoURL || event.bannerURL || "/placeholder-event.jpg",
          verificationStatus: event.verificationStatus,
          category: event.type || 'Uncategorized',
          participants: event.participants || [],
          venue: event.venue || "Location TBD",
          maxRegistrations: event.maxParticipants || 100,
          tags: Array.isArray(event.tags) ? event.tags : (event.tags ? [event.tags] : []),
          description: event.description || "No description available"
        }));

        setEvents(transformedEvents);

        // Set stats from dashboard API or calculate from events
        if (dashboardData && !dashboardData.error) {
          setStats({
            activeEvents: dashboardData.totalEvents || transformedEvents.length,
            totalRegistrations: dashboardData.totalParticipants || 0,
            pendingApprovals: dashboardData.pendingApprovals || 0,
            revenue: `₹${(dashboardData.totalRevenue || 0).toLocaleString()}`,
          });
        } else {
          // Calculate stats from events data
          const activeEvents = transformedEvents.filter(e => 
            e.verificationStatus === 'approved' || e.verificationStatus === 'pending'
          ).length;
          const totalRegistrations = transformedEvents.reduce((sum, e) => 
            sum + (e.participants?.length || 0), 0
          );
          
          setStats({
            activeEvents,
            totalRegistrations,
            pendingApprovals: transformedEvents.filter(e => e.verificationStatus === 'pending').length,
            revenue: "₹0",
          });
        }
        
      } catch (error) {
        console.error("Error loading events:", error);
        setError("Failed to load events data");
        
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

    loadEventsData();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Helper function to determine event status
  const getEventStatus = (event) => {
    if (event.verificationStatus === 'pending') return 'draft';
    if (event.verificationStatus === 'rejected') return 'rejected';
    
    const now = new Date();
    const eventDate = new Date(event.schedule?.start || event.createdAt);
    
    if (eventDate > now) return 'upcoming';
    if (eventDate < now) return 'past';
    return 'active';
  };

  // Filter events based on search and tab
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === "all") return matchesSearch;
    if (selectedTab === "active") return matchesSearch && (event.status === "active" || event.status === "upcoming");
    if (selectedTab === "upcoming") return matchesSearch && event.status === "upcoming";
    if (selectedTab === "draft") return matchesSearch && event.status === "draft";
    if (selectedTab === "past") return matchesSearch && event.status === "past";
    
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: "bg-green-500/20", text: "text-green-400", label: "Active" },
      upcoming: { bg: "bg-blue-500/20", text: "text-blue-400", label: "Upcoming" },
      draft: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Draft" },
      past: { bg: "bg-gray-500/20", text: "text-gray-400", label: "Past" },
      rejected: { bg: "bg-red-500/20", text: "text-red-400", label: "Rejected" }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`${config.bg} ${config.text} text-xs px-2 py-1 rounded-full font-medium`}>
        {config.label}
      </span>
    );
  };

  const statsCalculated = {
    total: events.length,
    active: events.filter(e => e.status === "active" || e.status === "upcoming").length,
    upcoming: events.filter(e => e.status === "upcoming").length,
    draft: events.filter(e => e.status === "draft").length,
    past: events.filter(e => e.status === "past").length
  };

  // Event handlers for HostEventCard
  const handleEditEvent = (event) => {
    console.log("Edit event:", event);
    // Navigate to edit event page or open edit modal
    navigate(`/host/events-new?edit=${event._id}`);
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        // Add delete API call here
        console.log("Delete event:", eventId);
        // Refresh events after deletion
        window.location.reload();
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event. Please try again.");
      }
    }
  };

  const handleViewParticipants = (event) => {
    console.log("View participants for event:", event);
    // Open participants modal or navigate to participants view
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
          <p className="text-gray-300">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <i className="ri-error-warning-line text-4xl text-red-400" />
          <h2 className="text-xl font-semibold">Error Loading Events</h2>
          <p className="text-gray-300">{error}</p>
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg font-medium transition-all"
            >
              Try Again
            </button>
            {error.includes('host permissions') && (
              <button 
                onClick={() => navigate('/host/registration')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                Complete Host Registration
              </button>
            )}
          </div>
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
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-[#0b0f2b] z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0 border-r border-gray-800`}
      >
        <HostSidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={events}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Header with view toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ textShadow: "0 0 8px rgba(155, 93, 229, 0.35)" }}>
                Manage Events
              </h1>
              <p className="text-gray-300 mt-1">
                {viewMode === "dashboard" 
                  ? `Manage events, approvals, and analytics in one place.${user?.name ? ` Hi, ${user.name}!` : ""}`
                  : "Create, manage, and track all your events"
                }
              </p>
            </div>
            
            <div className="flex gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-800/60 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("dashboard")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === "dashboard"
                      ? "bg-[#9b5de5] text-white"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <i className="ri-dashboard-line mr-2"></i>
                  Dashboard
                </button>
                <button
                  onClick={() => setViewMode("manage")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === "manage"
                      ? "bg-[#9b5de5] text-white"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  <i className="ri-list-check-2 mr-2"></i>
                  Manage
                </button>
              </div>

              <button 
                onClick={() => navigate('/host/events-new')}
                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all hover:shadow-[0_0_15px_rgba(155,93,229,0.35)]"
              >
                <i className="ri-add-line text-lg"></i>
                Create New Event
              </button>
            </div>
          </div>

          {viewMode === "dashboard" && (
            <>
              {/* Welcome Banner */}
              <div className="bg-gradient-to-r from-[#9b5de5]/20 to-transparent rounded-lg p-6 mb-6 border border-[#9b5de5]/15 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl font-bold">
                    Event Dashboard{user?.name ? ` — Hi, ${user.name}!` : ""}
                  </h2>
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

              {/* Recent Events */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-semibold">Recent Events</h2>
                  <button
                    className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    onClick={() => setViewMode("manage")}
                  >
                    <i className="ri-list-check-2" />
                    View All Events
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {events.slice(0, 4).map((event) => (
                    <HostEventCard 
                      key={event.id} 
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                      onViewParticipants={handleViewParticipants}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {viewMode === "manage" && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                {[
                  { label: "Total Events", count: statsCalculated.total, icon: "ri-calendar-line", color: "bg-[#9b5de5]/20 text-[#d9c4ff]" },
                  { label: "Active", count: statsCalculated.active, icon: "ri-play-circle-line", color: "bg-green-500/20 text-green-400" },
                  { label: "Upcoming", count: statsCalculated.upcoming, icon: "ri-time-line", color: "bg-blue-500/20 text-blue-400" },
                  { label: "Drafts", count: statsCalculated.draft, icon: "ri-draft-line", color: "bg-yellow-500/20 text-yellow-400" },
                  { label: "Past", count: statsCalculated.past, icon: "ri-history-line", color: "bg-gray-500/20 text-gray-400" }
                ].map((stat, index) => (
                  <div key={index} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40 hover:border-[#9b5de5]/30 transition-all">
                    <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                      <i className={`${stat.icon} text-lg`}></i>
                    </div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                    <div className="text-xl font-bold">{stat.count}</div>
                  </div>
                ))}
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: "all", label: "All Events", count: statsCalculated.total },
                  { id: "active", label: "Active", count: statsCalculated.active },
                  { id: "upcoming", label: "Upcoming", count: statsCalculated.upcoming },
                  { id: "draft", label: "Drafts", count: statsCalculated.draft },
                  { id: "past", label: "Past", count: statsCalculated.past }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedTab === tab.id
                        ? "bg-[#9b5de5] text-white"
                        : "bg-gray-800/60 text-gray-300 hover:bg-gray-800/80"
                    }`}
                  >
                    {tab.label}
                    <span className="bg-gray-700/60 text-xs px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Events Grid */}
              {filteredEvents.length === 0 ? (
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-700/60 flex items-center justify-center mx-auto mb-4">
                    <i className="ri-calendar-line text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No events found</h3>
                  <p className="text-gray-400 mb-6">
                    {searchQuery ? "Try adjusting your search terms" : "Start by creating your first event"}
                  </p>
                  <button 
                    onClick={() => navigate('/host/events-new')}
                    className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg font-medium transition-all"
                  >
                    Create Your First Event
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden hover:border-[#9b5de5]/30 transition-all group">
                      {/* Event Image */}
                      <div className="h-48 bg-gray-700 relative overflow-hidden">
                        <img 
                          src={event.cover} 
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-3 right-3">
                          {getStatusBadge(event.status)}
                        </div>
                        <div className="absolute top-3 left-3">
                          <div className="bg-gray-900/70 text-white text-xs px-2 py-1 rounded-full">
                            {event.category}
                          </div>
                        </div>
                      </div>

                      {/* Event Content */}
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#9b5de5] transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {event.description}
                        </p>

                        {/* Event Details */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-gray-400 text-sm">
                            <i className="ri-calendar-line mr-2"></i>
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center text-gray-400 text-sm">
                            <i className="ri-map-pin-line mr-2"></i>
                            {event.venue}
                          </div>
                          <div className="flex items-center text-gray-400 text-sm">
                            <i className="ri-user-line mr-2"></i>
                            {event.registrations} / {event.maxRegistrations} registered
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {event.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="bg-[#9b5de5]/20 text-[#d9c4ff] text-xs px-2 py-1 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditEvent(event)}
                              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                            >
                              <i className="ri-edit-line"></i>
                            </button>
                            <button 
                              onClick={() => window.open(`/events/${event._id}`, '_blank')}
                              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/events/${event._id}`);
                                alert('Event link copied to clipboard!');
                              }}
                              className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                            >
                              <i className="ri-share-line"></i>
                            </button>
                          </div>
                          <button 
                            onClick={() => handleDeleteEvent(event._id)}
                            className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-gray-700/50"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageEvents;