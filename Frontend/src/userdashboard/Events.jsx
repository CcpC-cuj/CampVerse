import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserEvents, getUpcomingEvents, getPastEvents, rsvpEvent as rsvpEventAPI, cancelRsvp } from "../api/events";
import Sidebar from "../userdashboard/sidebar";
import NavBar from "./NavBar";
import ShareButton from './ShareButton';
import { formatDateLong, formatDateShort } from "../utils/dateUtils";

const Events = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("registered");
  const [events, setEvents] = useState({ registered: [], upcoming: [], past: [], saved: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userRsvps, setUserRsvps] = useState(new Set());

  useEffect(() => {
    loadUserEvents();
  }, []);

  // Function to reload RSVP status from backend
  const loadUserRsvpStatus = async () => {
    try {
      const response = await getUserEvents();
      if (response.success && response.data && response.data.registeredEvents) {
        const rsvpedEventIds = new Set(
          response.data.registeredEvents.map(event => event._id || event.id)
        );
        setUserRsvps(rsvpedEventIds);
      }
    } catch (err) {
      console.error('Error loading user RSVP status:', err);
    }
  };

  const loadUserEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const [userEventsRes, upcomingRes, pastRes] = await Promise.all([
        getUserEvents().catch(() => ({ success: false })),
        getUpcomingEvents().catch(() => ({ success: false })),
        getPastEvents().catch(() => ({ success: false })),
      ]);

      const newEvents = { registered: [], upcoming: [], past: [], saved: [] };
      const rsvpSet = new Set();

      // Load registered events and build RSVP set
      if (userEventsRes.success && userEventsRes.data) {
        const registeredEvents = userEventsRes.data.registeredEvents || userEventsRes.data.events || [];
        newEvents.registered = registeredEvents;
        registeredEvents.forEach((event) => rsvpSet.add(event._id));
        if (userEventsRes.data.savedEvents) newEvents.saved = userEventsRes.data.savedEvents;
      }

      // Load upcoming events (filter out already registered ones)
      if (upcomingRes.success && upcomingRes.data) {
        const allUpcoming = upcomingRes.data.events || upcomingRes.data || [];
        newEvents.upcoming = allUpcoming.filter(event => !rsvpSet.has(event._id));
      }
      
      // Load past events
      if (pastRes.success && pastRes.data) {
        newEvents.past = pastRes.data.events || pastRes.data || [];
      }

      setEvents(newEvents);
      setUserRsvps(rsvpSet);
    } catch (err) {
      console.error("Error loading events:", err);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId) => {
    try {
      const isRsvped = userRsvps.has(eventId);
      const response = isRsvped ? await cancelRsvp(eventId) : await rsvpEventAPI(eventId);

      if (response.success) {
        alert(response.message || (isRsvped ? "RSVP cancelled successfully!" : "RSVP successful! Check your email for the QR code."));
        
        // Reload all events from backend to ensure consistency
        await loadUserEvents();
        
        // Close modal if open
        if (selectedEvent && selectedEvent._id === eventId) {
          setSelectedEvent(null);
        }
      } else {
        // Even on error, reload to sync state
        await loadUserEvents();
        alert(response.message || response.error || "RSVP failed. Please try again.");
      }
    } catch (err) {
      console.error("Error with RSVP:", err);
      // Reload events to ensure consistency
      await loadUserEvents();
      alert("RSVP failed. Please try again.");
    }
  };

  const getFilteredEvents = (eventList) => {
    if (!searchQuery) return eventList;
    return eventList.filter(
      (event) =>
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const EventCard = ({ event, showRSVPButton = false, showRegisteredBadge = false }) => (
    <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 border border-gray-800 hover:border-[#9b5de5]/30">
      {event.coverImage && <img src={event.coverImage} alt={event.title} className="w-full h-48 object-cover" />}
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white">{event.title}</h3>
          {showRegisteredBadge && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">Registered</span>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-2">📅 {formatDateShort(event.date)}</p>
        <p className="text-gray-400 text-sm mb-3">📍 {event.location?.venue || event.location?.type || "Location TBD"}</p>
        {event.description && <p className="text-gray-300 text-sm mb-3 line-clamp-2">{event.description}</p>}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {event.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs">{tag}</span>
            ))}
            {event.tags.length > 3 && <span className="text-gray-400 text-xs px-2 py-1">+{event.tags.length - 3} more</span>}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-xs">👥 {event.participants || 0} participants</p>
          {event.fee !== undefined && (
            <p className="text-sm font-medium">{event.fee === 0 ? <span className="text-green-400">Free</span> : <span className="text-blue-400">₹{event.fee}</span>}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSelectedEvent(event)} className="flex-1 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg transition-colors text-white text-sm">
            View Details
          </button>
          {showRSVPButton && (
            <button onClick={() => handleRSVP(event._id)} className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${userRsvps.has(event._id) ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#9b5de5] hover:bg-[#8c4be1] text-white"}`}>
              {userRsvps.has(event._id) ? "Cancel" : "RSVP"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 sm:translate-x-0`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <NavBar onOpenSidebar={() => setSidebarOpen(true)} eventsData={[]} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">My Events</h1>
              <p className="text-gray-400 mt-1">Manage your event registrations and discover new events</p>
            </div>
            <button onClick={loadUserEvents} className="mt-4 sm:mt-0 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors text-sm">🔄 Refresh</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: "registered", label: "Registered", count: events.registered.length },
              { key: "upcoming", label: "Discover", count: events.upcoming.length },
              { key: "past", label: "Past Events", count: events.past.length },
              { key: "saved", label: "Saved", count: events.saved.length },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setSelectedTab(tab.key)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTab === tab.key ? "bg-[#9b5de5] text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b5de5]"></div>
              <span className="ml-3 text-gray-400">Loading events...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
              <button onClick={loadUserEvents} className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors">Retry</button>
            </div>
          )}

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

      {/* Fully Styled Event Details Modal */}
{selectedEvent && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-6 bg-black/40 backdrop-blur-sm">
    <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl md:max-w-2xl lg:max-w-2xl xl:max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-700 p-6 relative">

      {/* Close Button (Top Left) */}
      <button
        onClick={() => setSelectedEvent(null)}
        className="absolute top-5 left-5 text-gray-400 hover:text-white transition-colors text-2xl font-bold z-50"
      >
        &times;
      </button>

      {/* Share Button (Top Right) */}
      <div className="absolute top-5 right-5 z-50">
        <ShareButton event={selectedEvent} />
      </div>

      {/* Event Image - make it rounded */}
      {selectedEvent.coverImage && (
        <div className="flex justify-center mb-4">
          <img
            src={selectedEvent.coverImage}
            alt={selectedEvent.title}
            className="w-65 sm:w-80 md:w-80 lg:w-80 h-48 sm:h-52 md:h-56 lg:h-56 object-cover rounded-2xl "
          />
        </div>
      )}
      
      {/* Rest of modal content remains same */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-2xl font-bold text-white">{selectedEvent.title}</h2>
        <span className="mt-2 sm:mt-0 px-3 py-1 bg-[#9b5de5]/20 text-[#d9c4ff] rounded-full text-sm font-medium">
          {selectedEvent.category}
        </span>
      </div>

      <p className="text-gray-400 text-sm mb-2">📅 {formatDateLong(selectedEvent.date)}</p>
      <p className="text-gray-400 text-sm mb-4">📍 {selectedEvent.location?.venue || selectedEvent.location?.type || "Location TBD"}</p>      {selectedEvent.description && <p className="text-gray-300 text-sm mb-4">{selectedEvent.description}</p>}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <p className="text-gray-400 text-sm">👥 {selectedEvent.participants || 0} participants</p>
        {selectedEvent.fee !== undefined && (
          <p className="text-sm font-medium mt-2 sm:mt-0">
            {selectedEvent.fee === 0 ? <span className="text-green-400">Free</span> : <span className="text-blue-400">₹{selectedEvent.fee}</span>}
          </p>
        )}
      </div>

      {selectedEvent.host && (
        <p className="text-gray-400 text-sm mb-4">🏢 Hosted by: {selectedEvent.host.name} ({selectedEvent.host.organization})</p>
      )}

      {selectedEvent.tags && selectedEvent.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedEvent.tags.map((tag, idx) => (
            <span key={idx} className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <button
          onClick={() => handleRSVP(selectedEvent._id)}
          className={`flex-1 px-4 py-2 rounded-lg transition-colors text-white font-medium ${
            userRsvps.has(selectedEvent._id) ? "bg-red-600 hover:bg-red-700" : "bg-[#9b5de5] hover:bg-[#8c4be1]"
          }`}
        >
          {userRsvps.has(selectedEvent._id) ? "Cancel RSVP" : "RSVP"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default Events;
