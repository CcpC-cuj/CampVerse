import React, { useState, useEffect } from "react";
import EventDetailsModal from "./EventDetailsModal";
import { listEvents, rsvpEvent, getEventRecommendations, advancedEventSearch } from "../api/events";
import { useAuth } from "../contexts/AuthContext";

// Placeholder images for mock data
const hackathonImg = "/event-placeholder.png";
const DiscoverEvents = () => {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userRsvps, setUserRsvps] = useState(new Set());
  const [successMsg, setSuccessMsg] = useState("");
  const [events, setEvents] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Tech", "Cultural", "Sports", "Workshops", "Academic"];

  useEffect(() => {
    fetchEvents();
    fetchRecommendations();
  }, [user, selectedCategory]);

  const transformEvent = (event) => {
    const d = new Date(event.date);
    const year = d.getUTCFullYear();
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const day = d.getUTCDate();
    let hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');

    return {
      id: event._id,
      title: event.title,
      date: `${month} ${day}, ${year}`,
      time: `${hours}:${formattedMinutes} ${ampm}`,
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
    };
  };

  const fetchRecommendations = async () => {
    if (!user) return;
    try {
      const response = await getEventRecommendations(6);
      if (response.success && response.recommendations) {
        const transformedRecs = response.recommendations.map(rec => {
          const event = rec.event;
          if (!event) return null;
          const d = new Date(event.date);
          const year = d.getUTCFullYear();
          const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
          const day = d.getUTCDate();
          let hours = d.getUTCHours();
          const minutes = d.getUTCMinutes();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          const formattedMinutes = minutes.toString().padStart(2, '0');
          
          return {
            id: event._id,
            title: event.title,
            date: `${month} ${day}, ${year}`,
            time: `${hours}:${formattedMinutes} ${ampm}`,
            location: event.location?.venue || event.location?.type || 'N/A',
            host: event.organizationName || event.organizer?.name || 'Host',
            participants: event.participants || event.registrations || 0,
            tags: Array.isArray(event.tags) ? event.tags : [],
            description: event.description || '',
            sessions: event.sessions || [],
            image: event.bannerURL || event.bannerImage || hackathonImg,
            isPaid: event.isPaid,
            price: event.price || event.fee,
            _id: event._id,
            reason: rec.reason || 'Based on your interests',
            score: rec.similarityScore
          };
        }).filter(Boolean);
        setRecommendations(transformedRecs);
      }
    } catch {
      // Failed to fetch recommendations - silently ignore
    }
  };

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

          const audienceType = event.audienceType || 'public';

          // Always show events hosted by the current user
          const eventHostId = event.hostUserId?._id || event.hostUserId?.id || event.hostUserId;
          const currentUserId = user?.id || user?._id;
          if (eventHostId && currentUserId && String(eventHostId) === String(currentUserId)) {
            return true;
          }

          // Show public events
          if (audienceType === 'public') {
            return true;
          }

          // Show institution events if user belongs to the same institution
          if (audienceType === 'institution' && user?.institutionId) {
            const eventInstitutionId = event.institutionId?._id || event.institutionId?.id || event.institutionId;
            const userInstitutionId = user.institutionId?._id || user.institutionId?.id || user.institutionId;
            return String(eventInstitutionId) === String(userInstitutionId);
          }

          return false;
        });
        // Transform backend events to match component format
        let transformedEvents = filteredEvents.map(transformEvent);

        // Apply local category filtering if not 'All'
        if (selectedCategory !== "All") {
          transformedEvents = transformedEvents.filter(e => 
            e.tags?.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase()) ||
            e.title?.toLowerCase().includes(selectedCategory.toLowerCase())
          );
        }

        setEvents(transformedEvents);
      } else {
        // API failed, show nothing
        setEvents([]);
      }
    } catch {
      setError('Failed to load events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchEvents();
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await advancedEventSearch({ q: searchQuery.trim() });
      const eventsArr = res?.data?.events || res?.events || [];
      const transformed = Array.isArray(eventsArr) ? eventsArr.map(transformEvent) : [];
      setEvents(transformed);
    } catch {
      setError('Failed to search events. Please try again.');
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
    } catch {
      setSuccessMsg("RSVP failed. Please try again.");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };



  return (
    <div className="bg-transparent rounded-lg p-4 sm:p-6">
      {/* Search & Categories */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for events, workshops, or competitions..."
              className="w-full bg-gray-900/60 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-[#9b5de5] transition-all outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-8 py-3 bg-gradient-to-r from-[#9b5de5] to-[#7b2cbf] hover:from-[#8c4be1] hover:to-[#6a1b9a] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#9b5de5]/20"
          >
            Search
          </button>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedCategory === cat
                  ? "bg-[#9b5de5] border-[#9b5de5] text-white shadow-lg shadow-[#9b5de5]/20"
                  : "bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-[#9b5de5]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
            </svg>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Recommended For You</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((event) => (
              <div
                key={event.id}
                className="bg-gradient-to-br from-[#9b5de5]/10 to-[#1a1f4d] rounded-lg overflow-hidden shadow hover:shadow-xl transition duration-300 border border-[#9b5de5]/30 hover:border-[#9b5de5]/60"
              >
                <div className="relative">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-[#9b5de5] text-white text-xs px-2 py-1 rounded-full">
                    ★ Recommended
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-white truncate">{event.title}</h3>
                  <p className="text-gray-400 text-sm mt-1 truncate">
                    {event.date} • {event.location}
                  </p>
                  <p className="text-[#9b5de5] text-xs mt-2 italic">{event.reason}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {event.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="mt-3 bg-[#9b5de5] hover:bg-[#8c4be1] px-4 py-2 rounded-lg w-full transition-colors text-white text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Events Section */}
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
