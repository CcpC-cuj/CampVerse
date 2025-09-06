import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserEvents, getUpcomingEvents, getPastEvents, rsvpEvent as rsvpEventAPI, cancelRsvp } from "../api/events";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "./NavBar";
import EventDetailsModal from "./EventDetailsModal";

const Events = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("registered");
  const [events, setEvents] = useState({
    registered: [],
    upcoming: [],
    past: [],
    saved: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userRsvps, setUserRsvps] = useState(new Set());

  useEffect(() => {
    loadUserEvents();
  }, []);

  const loadUserEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load user's events and RSVPs
      const [userEventsRes, upcomingRes, pastRes] = await Promise.all([
        getUserEvents().catch(() => ({ success: false })),
        getUpcomingEvents().catch(() => ({ success: false })),
        getPastEvents().catch(() => ({ success: false }))
      ]);

      const newEvents = {
        registered: [],
        upcoming: [],
        past: [],
        saved: []
      };

      const rsvpSet = new Set();

      // Process user events (registered events)
      if (userEventsRes.success && userEventsRes.data) {
        const registeredEvents = userEventsRes.data.registeredEvents || userEventsRes.data.events || [];
        newEvents.registered = registeredEvents;
        registeredEvents.forEach(event => rsvpSet.add(event._id));

        if (userEventsRes.data.savedEvents) {
          newEvents.saved = userEventsRes.data.savedEvents;
        }
      }

      // Process upcoming events
      if (upcomingRes.success && upcomingRes.data) {
        newEvents.upcoming = upcomingRes.data.events || upcomingRes.data || [];
      }

      // Process past events  
      if (pastRes.success && pastRes.data) {
        newEvents.past = pastRes.data.events || pastRes.data || [];
      }

      // If APIs fail, show mock data for demonstration
      if (!userEventsRes.success && !upcomingRes.success && !pastRes.success) {
        newEvents.registered = [
          {
            _id: "mock_reg_1",
            title: "Annual Tech Symposium 2025",
            description: "A comprehensive technology symposium featuring the latest innovations",
            date: "2025-09-15T09:00:00Z",
            location: "Memorial Auditorium, CUJ Campus",
            category: "Technology",
            tags: ["Technology", "Innovation", "Networking"],
            coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            participants: 312,
            host: { name: "Tech Club CUJ", organization: "CUJ" },
            registeredAt: "2025-09-01T10:00:00Z"
          }
        ];

        newEvents.upcoming = [
          {
            _id: "mock_up_1",
            title: "Web Development Workshop",
            description: "Learn modern web development with React and Node.js",
            date: "2025-09-20T14:00:00Z",
            location: "Computer Lab, CUJ",
            category: "Programming",
            tags: ["Web Development", "React", "Node.js"],
            coverImage: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800",
            participants: 87,
            maxParticipants: 50,
            fee: 500,
            host: { name: "Code Club", organization: "CUJ" }
          },
          {
            _id: "mock_up_2", 
            title: "Cultural Evening 2025",
            description: "An evening of music, dance and cultural performances",
            date: "2025-10-05T18:00:00Z",
            location: "Central Auditorium, CUJ",
            category: "Cultural",
            tags: ["Cultural", "Music", "Dance"],
            coverImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
            participants: 156,
            fee: 0,
            host: { name: "Cultural Committee", organization: "CUJ" }
          }
        ];

        newEvents.past = [
          {
            _id: "mock_past_1",
            title: "Spring Hackathon 2025", 
            description: "48-hour coding marathon completed",
            date: "2025-08-15T10:00:00Z",
            endDate: "2025-08-17T10:00:00Z",
            location: "Engineering Block, CUJ",
            category: "Programming",
            tags: ["Hackathon", "Programming", "Competition"],
            coverImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
            participants: 124,
            host: { name: "Programming Club", organization: "CUJ" },
            completedAt: "2025-08-17T10:00:00Z"
          }
        ];

        rsvpSet.add("mock_reg_1");
      }

      setEvents(newEvents);
      setUserRsvps(rsvpSet);

    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId) => {
    try {
      const isRsvped = userRsvps.has(eventId);
      const response = isRsvped 
        ? await cancelRsvp(eventId)
        : await rsvpEventAPI(eventId);

      if (response.success) {
        // Update local RSVP state
        const newRsvps = new Set(userRsvps);
        if (isRsvped) {
          newRsvps.delete(eventId);
          // Remove from registered events
          setEvents(prev => ({
            ...prev,
            registered: prev.registered.filter(event => event._id !== eventId)
          }));
        } else {
          newRsvps.add(eventId);
          // Move event from upcoming to registered
          const event = events.upcoming.find(e => e._id === eventId);
          if (event) {
            setEvents(prev => ({
              ...prev,
              registered: [...prev.registered, { ...event, registeredAt: new Date().toISOString() }],
              upcoming: prev.upcoming.filter(e => e._id !== eventId)
            }));
          }
        }
        setUserRsvps(newRsvps);
      } else {
        alert(response.message || 'RSVP failed');
      }
    } catch (err) {
      console.error('Error with RSVP:', err);
      alert('RSVP failed');
    }
  };

  const getFilteredEvents = (eventList) => {
    if (!searchQuery) return eventList;
    
    return eventList.filter(event =>
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const EventCard = ({ event, showRSVPButton = false, showRegisteredBadge = false }) => (
    <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 border border-gray-800 hover:border-[#9b5de5]/30">
      {event.coverImage && (
        <img
          src={event.coverImage}
          alt={event.title}
          className="w-full h-48 object-cover"
        />
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white">{event.title}</h3>
          {showRegisteredBadge && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
              Registered
            </span>
          )}
        </div>
        
        <p className="text-gray-400 text-sm mb-2">
          📅 {formatDate(event.date)}
        </p>
        
        <p className="text-gray-400 text-sm mb-3">
          📍 {event.location || 'Location TBD'}
        </p>

        {event.description && (
          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
            {event.description}
          </p>
        )}

        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {event.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs"
              >
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="text-gray-400 text-xs px-2 py-1">
                +{event.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-xs">
            👥 {event.participants || 0} participants
          </p>
          {event.fee !== undefined && (
            <p className="text-sm font-medium">
              {event.fee === 0 ? (
                <span className="text-green-400">Free</span>
              ) : (
                <span className="text-blue-400">₹{event.fee}</span>
              )}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedEvent(event)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors text-white text-sm"
          >
            View Details
          </button>
          {showRSVPButton && (
            <button
              onClick={() => handleRSVP(event._id)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                userRsvps.has(event._id)
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#9b5de5] hover:bg-[#8c4be1] text-white'
              }`}
            >
              {userRsvps.has(event._id) ? 'Cancel' : 'RSVP'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

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
      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0`}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        
        {/* Top Navigation */}
        <NavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={[]} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">My Events</h1>
              <p className="text-gray-400 mt-1">Manage your event registrations and discover new events</p>
            </div>
            <button
              onClick={loadUserEvents}
              className="mt-4 sm:mt-0 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🔄 Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: "registered", label: "Registered", count: events.registered.length },
              { key: "upcoming", label: "Discover", count: events.upcoming.length },
              { key: "past", label: "Past Events", count: events.past.length },
              { key: "saved", label: "Saved", count: events.saved.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTab === tab.key
                    ? "bg-[#9b5de5] text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b5de5]"></div>
              <span className="ml-3 text-gray-400">Loading events...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadUserEvents}
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Events Content */}
          {!loading && !error && (
            <div>
              {selectedTab === "registered" && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-white">Registered Events</h2>
                  {getFilteredEvents(events.registered).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No registered events</p>
                      <p className="text-gray-500 text-sm mt-2">Browse upcoming events to register</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredEvents(events.registered).map((event) => (
                        <EventCard key={event._id} event={event} showRegisteredBadge={true} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === "upcoming" && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-white">Discover Events</h2>
                  {getFilteredEvents(events.upcoming).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No upcoming events</p>
                      <p className="text-gray-500 text-sm mt-2">Check back later for new events</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredEvents(events.upcoming).map((event) => (
                        <EventCard key={event._id} event={event} showRSVPButton={true} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === "past" && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-white">Past Events</h2>
                  {getFilteredEvents(events.past).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No past events</p>
                      <p className="text-gray-500 text-sm mt-2">Events you've attended will appear here</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredEvents(events.past).map((event) => (
                        <EventCard key={event._id} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedTab === "saved" && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-white">Saved Events</h2>
                  {getFilteredEvents(events.saved).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400 text-lg">No saved events</p>
                      <p className="text-gray-500 text-sm mt-2">Save events to view them later</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getFilteredEvents(events.saved).map((event) => (
                        <EventCard key={event._id} event={event} showRSVPButton={true} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <EventDetailsModal
              event={selectedEvent}
              onBack={() => setSelectedEvent(null)}
              onRSVP={handleRSVP}
              isRsvped={userRsvps.has(selectedEvent._id)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
