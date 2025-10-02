import React, { useState, useEffect } from "react";
import ShareButton from "./ShareButton";
import EventDetailsModal from "./EventDetailsModal";
import { listEvents, rsvpEvent, cancelRsvp } from "../api/events";
import { useAuth } from "../contexts/AuthContext";

// Placeholder images for mock data
const hackathonImg = "/event-placeholder.png";
const DiscoverEvents = () => {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userRsvps, setUserRsvps] = useState(new Set());
  const [successMsg, setSuccessMsg] = useState("");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await listEvents();
  // Fetched events: (console.log removed)
      
      const eventsArr = response?.data?.events || [];
      if (Array.isArray(eventsArr)) {
        // Filter events: show only approved and upcoming/ongoing events
        const filteredEvents = eventsArr.filter(event => {
          // Only show events with verificationStatus 'approved'
          if (event.verificationStatus !== 'approved') {
            return false;
          }
          // Only show events with status 'upcoming' or 'ongoing'
          if (event.status !== 'upcoming' && event.status !== 'ongoing') {
            return false;
          }
          // Show public events
          if (event.audienceType === 'public') {
            return true;
          }
          // Show institution events if user belongs to the same institution
          if (event.audienceType === 'institution' && user?.institutionId) {
            return event.institutionId === user.institutionId;
          }
          return false;
        });
        // Transform backend events to match component format
        const transformedEvents = filteredEvents.map(event => ({
          id: event._id,
          title: event.title,
          date: new Date(event.date).toLocaleDateString('en-US', {
            month: "long",
            day: "numeric",
            year: "numeric"
          }),
          time: new Date(event.date).toLocaleTimeString('en-US', {
            hour: "2-digit",
            minute: "2-digit"
          }),
          location: event.location?.venue || event.location?.type || 'N/A',
          host: event.organizationName || event.organizer?.name || 'Host',
          participants: event.participants || event.registrations || 0,
          tags: Array.isArray(event.tags) ? event.tags : [],
          description: event.description || '',
          sessions: event.sessions || [],
          image: event.bannerURL || event.bannerImage || hackathonImg,
          isPaid: event.isPaid,
          price: event.price || event.fee,
          _id: event._id
        }));
        setEvents(transformedEvents);
      } else {
        // API failed, show nothing
        setEvents([]);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Showing sample events.');
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId) => {
    try {
      const response = await rsvpEvent(eventId);
      
      if (response.success) {
        const newRsvps = new Set(userRsvps);
        newRsvps.add(eventId);
        setUserRsvps(newRsvps);
        setSuccessMsg("You have successfully RSVPed!");
        setTimeout(() => setSuccessMsg(""), 3000);
        // Refresh events to get updated data
        fetchEvents();
      } else {
        setSuccessMsg(response.message || response.error || "RSVP failed. Please try again.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      console.error('RSVP error:', err);
      setSuccessMsg("RSVP failed. Please try again.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(`${event.date} ${event.time}`);
    return now < eventDate ? "upcoming" : "past";
  };

  return (
    <div className="bg-transparent rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Discover Events</h2>
        {!loading && (
          <button
            onClick={fetchEvents}
            className="px-4 py-2 bg-[#9b5de5]/20 hover:bg-[#9b5de5]/30 rounded-lg transition-colors text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 mb-4 text-yellow-300 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9b5de5]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-gray-900 rounded-lg overflow-hidden shadow hover:shadow-xl transition duration-300 border border-gray-800 hover:border-[#9b5de5]/30"
            >
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-48 sm:h-52 md:h-56 object-cover"
              />
              <div className="p-4 flex flex-col justify-between">
                <h3 className="text-lg sm:text-base font-bold text-white truncate">{event.title}</h3>
                <p className="text-gray-400 text-sm mt-1 truncate">
                  {event.date} • {event.location}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {event.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs sm:text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedEvent(event)}
                  className="mt-4 bg-[#9b5de5] hover:bg-[#8c4be1] px-4 py-2 rounded-lg w-full transition-colors text-white text-sm sm:text-xs"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Modal (refactored to use shared component) */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setSelectedEvent(null)}>
          <div className="max-w-4xl w-full sm:w-[90%] md:w-[80%]">
            <EventDetailsModal
              event={selectedEvent}
              onBack={() => setSelectedEvent(null)}
              onRSVP={() => handleRSVP(selectedEvent._id || selectedEvent.id)}
              isRsvped={userRsvps.has(selectedEvent.id)}
            />
            {successMsg && (
              <div className="text-green-400 font-medium text-center text-sm sm:text-base mt-2">
                {successMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverEvents;
