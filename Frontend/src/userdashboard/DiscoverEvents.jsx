import React, { useState, useEffect } from "react";
import EventDetailsModal from "./EventDetailsModal";
import { listEvents, searchEvents, rsvpEvent as rsvpEventAPI, cancelRsvp } from "../api/events";

const DiscoverEvents = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRsvps, setUserRsvps] = useState(new Set());

  // Load events on component mount
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listEvents();
      if (response.success && response.data) {
        // Transform events to ensure proper field mapping
        const transformedEvents = (response.data.events || response.data || []).map(event => ({
          ...event,
          // Map schedule.start to date for consistency
          date: event.schedule?.start || event.date || event.createdAt,
          endDate: event.schedule?.end || event.endDate,
          // Ensure participants count is a number
          participants: Array.isArray(event.participants) ? event.participants.length : (event.participants || 0),
          // Map location field
          location: event.location || event.venue || 'Location TBD',
          // Ensure tags is an array and filter out empty/invalid tags
          tags: Array.isArray(event.tags) ? event.tags.filter(tag => tag && tag !== '[]' && tag.trim()) : [],
          // Map image fields - use logoURL or bannerURL for coverImage
          coverImage: event.coverImage || event.logoURL || event.bannerURL || null
        }));
        
        setEvents(transformedEvents);
        // Track user RSVPs
        if (response.data.userRsvps) {
          setUserRsvps(new Set(response.data.userRsvps));
        }
      } else {
        setError(response.message || 'Failed to load events');
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadEvents();
      return;
    }

    try {
      setLoading(true);
      const response = await searchEvents(searchQuery, {});
      if (response.success && response.data) {
        // Apply the same transformation as in loadEvents
        const transformedEvents = (response.data.events || response.data || []).map(event => ({
          ...event,
          date: event.schedule?.start || event.date || event.createdAt,
          endDate: event.schedule?.end || event.endDate,
          participants: Array.isArray(event.participants) ? event.participants.length : (event.participants || 0),
          location: event.location || event.venue || 'Location TBD',
          tags: Array.isArray(event.tags) ? event.tags.filter(tag => tag && tag !== '[]' && tag.trim()) : [],
          coverImage: event.coverImage || event.logoURL || event.bannerURL || null
        }));
        
        setEvents(transformedEvents);
      } else {
        setError(response.message || 'Search failed');
      }
    } catch (err) {
      console.error('Error searching events:', err);
      setError('Search failed');
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
        } else {
          newRsvps.add(eventId);
        }
        setUserRsvps(newRsvps);

        // Update event participant count
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event._id === eventId 
              ? { 
                  ...event, 
                  participants: isRsvped 
                    ? Math.max(0, (event.participants || 1) - 1)
                    : (event.participants || 0) + 1 
                }
              : event
          )
        );
      } else {
        alert(response.message || 'RSVP failed');
      }
    } catch (err) {
      console.error('Error with RSVP:', err);
      alert('RSVP failed');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(event.date);
    const endDate = event.endDate ? new Date(event.endDate) : eventDate;

    if (now < eventDate) return 'upcoming';
    if (now > endDate) return 'past';
    return 'ongoing';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-bold text-white mb-4 sm:mb-0">Discover Events</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-[#9b5de5] focus:outline-none flex-1 sm:w-64"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-[#9b5de5] hover:bg-[#8c4be1] text-white rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Event Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9b5de5] mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading events...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadEvents}
            className="mt-4 px-4 py-2 bg-[#9b5de5] hover:bg-[#8c4be1] text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event._id} className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-650 transition-colors">
              {/* Event Image */}
              <div className="relative">
                <img
                  src={event.coverImage || 'https://via.placeholder.com/400x200/2D3748/9CA3AF?text=Event+Image'}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x200/2D3748/9CA3AF?text=Event+Image';
                  }}
                />
                {!event.coverImage && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-900/50 to-blue-900/50 flex items-center justify-center">
                    <span className="text-white text-sm opacity-75">No Image Available</span>
                  </div>
                )}
              </div>

              {/* Event Content */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-white truncate flex-1">{event.title}</h3>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    getEventStatus(event) === 'upcoming' 
                      ? 'bg-green-900 text-green-300' 
                      : getEventStatus(event) === 'ongoing'
                      ? 'bg-blue-900 text-blue-300'
                      : 'bg-gray-600 text-gray-300'
                  }`}>
                    {getEventStatus(event) === 'upcoming' ? 'Upcoming' : 
                     getEventStatus(event) === 'ongoing' ? 'Ongoing' : 'Past'}
                  </span>
                </div>
                
                <p className="text-gray-300 text-sm mb-3 line-clamp-2">{event.description}</p>
                
                <div className="space-y-1 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{formatDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>{event.participants} participants</span>
                  </div>
                </div>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {event.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-[#9b5de5] bg-opacity-20 text-[#9b5de5] text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {event.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded">
                        +{event.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="flex-1 px-4 py-2 bg-[#9b5de5] hover:bg-[#8c4be1] text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    View Details
                  </button>
                  {getEventStatus(event) === 'upcoming' && (
                    userRsvps.has(event._id) ? (
                      <button
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-400 text-white cursor-not-allowed"
                        disabled
                      >
                        Registered
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRSVP(event._id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                      >
                        RSVP
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEvent(null);
            }
          }}
        >
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

export default DiscoverEvents;