import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getMyEvents } from "../api/host";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import EnhancedHostEventCard from "./EnhancedHostEventCard";
import CreateEventModal from "./components/CreateEventModal";
import EditEventModal from "./components/EditEventModal";
import DeleteEventModal from "./components/DeleteEventModal";

const ManageEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const loadEventsData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading host events data...");

        // Load events
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
        
      } catch (error) {
        console.error("Error loading events:", error);
        setError("Failed to load events data");
        
        // Set empty state
        if (mounted) {
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
    setSelectedEvent(event);
    setShowEditModal(true);
  };

  const handleDeleteEvent = (eventId) => {
    // Find the event by ID - check both id and _id fields
    const event = events.find(e => e.id === eventId || e._id === eventId);
    if (event) {
      setSelectedEvent(event);
      setShowDeleteModal(true);
    } else {
      // If we can't find by ID, try to find by the full event object
      // This handles cases where the onDelete handler passes the full event
      if (eventId && typeof eventId === 'object' && (eventId.id || eventId._id)) {
        setSelectedEvent(eventId);
        setShowDeleteModal(true);
      }
    }
  };

  const handleViewParticipants = (event) => {
    console.log("View participants for event:", event);
    // Open participants modal or navigate to participants view
  };

  const handleEventCreated = () => {
    // Reload the page to refresh events
    window.location.reload();
  };

  const handleEventUpdated = () => {
    // Reload the page to refresh events
    window.location.reload();
  };

  const handleEventDeleted = () => {
    // Reload the page to refresh events
    window.location.reload();
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ textShadow: "0 0 8px rgba(155, 93, 229, 0.35)" }}>
                Manage Events
              </h1>
              <p className="text-gray-300 mt-1">
                Create, manage, and track all your events
              </p>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all hover:shadow-[0_0_15px_rgba(155,93,229,0.35)]"
            >
              <i className="ri-add-line text-lg"></i>
              Create New Event
            </button>
          </div>

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
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg font-medium transition-all"
                  >
                    Create Your First Event
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEvents.map((event) => (
                    <EnhancedHostEventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                      onViewParticipants={handleViewParticipants}
                    />
                  ))}
                </div>
              )}
        </div>
      </div>

      {/* Modals */}
      <CreateEventModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
      />
      
      <EditEventModal 
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onEventUpdated={handleEventUpdated}
        event={selectedEvent}
      />
      
      <DeleteEventModal 
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onEventDeleted={handleEventDeleted}
        event={selectedEvent}
      />
    </div>
  );
};

export default ManageEvents;