import React, { useEffect, useState } from "react";
import { listEvents, rsvpEvent as rsvpEventAPI, getEventById } from "../api/events";
import { X } from "lucide-react";
import ShareButton from "./ShareButton";

const DiscoverEvents = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userRsvps, setUserRsvps] = useState(new Set());
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await listEvents();
        const list = (res?.data && res.data.events) || res?.events || [];
        if (!mounted) return;
        const normalized = list.map(ev => ({
          id: ev._id,
          title: ev.title,
          date: ev.date ? new Date(ev.date).toLocaleDateString() : '',
          time: ev.date ? new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          location: ev.location || 'Online',
          host: ev.host?.name || ev.organizer,
          participants: ev.participants || 0,
          tags: Array.isArray(ev.tags) ? ev.tags : (typeof ev.tags === 'string' ? ev.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
          description: ev.description || '',
          image: ev.coverImage || ev.bannerURL,
        }));
        setEvents(normalized);
      } catch (e) {
        setError('Failed to load events');
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleRSVP = async (event) => {
    try {
      const res = await rsvpEventAPI(event.id);
      if (res?.success) {
      const newRsvps = new Set(userRsvps);
      newRsvps.add(event.id);
      setUserRsvps(newRsvps);
      setSuccessMsg("You have successfully RSVPed!");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setSuccessMsg(res?.error || res?.message || 'RSVP failed');
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (e) {
      setSuccessMsg('RSVP failed');
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
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">Discover Events</h2>

      {loading && (
        <div className="text-gray-400">Loading events...</div>
      )}
      {error && (
        <div className="text-red-400">{error}</div>
      )}
      {!loading && !error && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {events.length === 0 && (
          <div className="text-gray-400 col-span-full">No events available</div>
        )}
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-gray-900 rounded-lg overflow-hidden shadow hover:shadow-xl transition duration-300 border border-gray-800 hover:border-[#9b5de5]/30"
          >
            {event.image && (
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-48 sm:h-52 md:h-56 object-cover"
            />
            )}
            <div className="p-4 flex flex-col justify-between">
              <h3 className="text-lg sm:text-base font-bold text-white truncate">{event.title}</h3>
              <p className="text-gray-400 text-sm mt-1 truncate">
                {event.date} • {event.location}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {event.tags && event.tags.map((tag, idx) => (
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

      {/* Event Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setSelectedEvent(null)}
        >
          <div className="bg-gray-900/95 rounded-lg max-w-4xl w-full sm:w-[90%] md:w-[80%] overflow-y-auto shadow-xl p-4 sm:p-6 relative">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-2 sm:mb-4 relative">
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-white p-1 rounded-full hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <ShareButton
                title={selectedEvent.title}
                description={selectedEvent.description}
              />
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              {selectedEvent.title}
            </h2>
            <span
              className={`mt-1 inline-block px-2 py-1 text-xs sm:text-sm font-medium rounded-full ${
                getEventStatus(selectedEvent) === "upcoming"
                  ? "bg-green-900 text-green-300"
                  : "bg-gray-600 text-gray-300"
              }`}
            >
              {getEventStatus(selectedEvent) === "upcoming" ? "Upcoming" : "Past"}
            </span>

            <div className="mt-3 sm:mt-4 space-y-3 text-gray-300 text-sm sm:text-base">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>{selectedEvent.date} at {selectedEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <span>{selectedEvent.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <span>{selectedEvent.host}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span>{selectedEvent.participants} participants</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-white">About</h3>
                  <p className="text-sm sm:text-base">{selectedEvent.description}</p>

                  {Array.isArray(selectedEvent.sessions) && selectedEvent.sessions.length > 0 && (
                    <>
                  <h3 className="font-semibold text-white mt-2">Sessions</h3>
                  <ul className="list-disc list-inside text-sm sm:text-base space-y-1">
                    {selectedEvent.sessions.map((s, i) => (
                      <li key={i}>
                        <span className="font-medium">{s.title}</span> - {s.time} | {s.speaker}
                      </li>
                    ))}
                  </ul>
                    </>
                  )}

                  {Array.isArray(selectedEvent.tags) && selectedEvent.tags.length > 0 && (
                    <>
                  <h3 className="font-semibold text-white mt-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs sm:text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                    </>
                  )}
                </div>
              </div>

              {successMsg && (
                <div className="text-green-400 font-medium text-center text-sm sm:text-base">
                  {successMsg}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={async () => {
                    try {
                      const details = await getEventById(selectedEvent.id);
                      setSelectedEvent(prev => ({ ...prev, ...details }));
                    } catch {}
                    await handleRSVP(selectedEvent);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors text-sm sm:text-base ${
                    userRsvps.has(selectedEvent.id)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                  disabled={userRsvps.has(selectedEvent.id)}
                >
                  {userRsvps.has(selectedEvent.id) ? "RSVPed" : "RSVP"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverEvents;
