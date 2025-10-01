import React, { useState, useEffect } from "react";
import { getEventById } from "../api/events";

const EventDetails = ({ event, onBack, onRSVP, isRsvped }) => {
  const [eventDetails, setEventDetails] = useState(event);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (event._id) {
      loadEventDetails();
    }
  }, [event._id]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const response = await getEventById(event._id);
      if (response.success && response.data) {
        setEventDetails(response.data);
      }
    } catch (err) {
      console.error('Error loading event details:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = () => {
    onRSVP(eventDetails._id || eventDetails.id);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventStatus = () => {
    const now = new Date();
    const eventDate = new Date(eventDetails.date);
    const endDate = eventDetails.endDate ? new Date(eventDetails.endDate) : eventDate;
    
    if (now < eventDate) return 'upcoming';
    if (now > endDate) return 'past';
    return 'ongoing';
  };

  const status = getEventStatus();

  return (
  <div className="text-white">
      {/* Banner Image at Top */}
      {eventDetails.coverImage && (
        <div className="relative">
          <img
            src={eventDetails.coverImage}
            alt={eventDetails.title}
            className="w-full h-48 object-cover rounded-t-lg"
          />
        </div>
      )}

      {/* Modal Header with Organiser Logo and Name */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Organiser Logo */}
          <div className="w-12 h-12 bg-[#9b5de5] rounded-full flex items-center justify-center">
            <span className="text-white font-semibold text-lg">
              {eventDetails.hostUserId?.name
                ? eventDetails.hostUserId.name.charAt(0).toUpperCase()
                : (eventDetails.organizer?.charAt(0)?.toUpperCase() || 'H')}
            </span>
          </div>
          {/* Organiser Name */}
          <div>
            <p className="font-medium text-lg">
              {eventDetails.hostUserId?.name || eventDetails.organizer || 'Event Host'}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b5de5] mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading event details...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {eventDetails.title}
                </h2>
                <span
                  className={`mt-1 inline-block px-2 py-1 text-xs sm:text-sm font-medium rounded-full ${
                    status === "upcoming"
                      ? "bg-green-900 text-green-300"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  {status === "upcoming" ? "Upcoming" : status === "ongoing" ? "Ongoing" : "Past"}
                </span>
              </div>
              {/* Share/Copy Event Link Button */}
              <button
                onClick={() => {
                  const baseUrl = window.location.origin;
                  const url = `${baseUrl}/events/${eventDetails._id || eventDetails.id}`;
                  navigator.clipboard.writeText(url);
                }}
                className="px-3 py-1 rounded-full bg-gray-700 text-white text-xs hover:bg-[#9b5de5] transition-colors mt-2 sm:mt-0"
                title="Copy event link"
              >
                📋 Copy Event Link
              </button>
            </div>

            <div className="mt-3 sm:mt-4 space-y-3 text-gray-300 text-sm sm:text-base">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>{formatDate(eventDetails.date)}{eventDetails.time ? ` at ${eventDetails.time}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏁</span>
                    <span>{eventDetails.endDate ? `Ends: ${formatDate(eventDetails.endDate)}` : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <span>{eventDetails.location?.venue || eventDetails.location?.type || eventDetails.venue || 'Location TBD'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">�</span>
                    <span>{eventDetails.hostUserId?.name || eventDetails.organizer || eventDetails.host || 'Host'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span>{eventDetails.participants || 0} participants</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-white">About</h3>
                  <p className="text-sm sm:text-base">{eventDetails.description || 'No description available.'}</p>

                  {eventDetails.sessions && eventDetails.sessions.length > 0 && (
                    <>
                      <h3 className="font-semibold text-white mt-2">Sessions</h3>
                      <ul className="list-disc list-inside text-sm sm:text-base space-y-1">
                        {eventDetails.sessions.map((s, i) => (
                          <li key={i}>
                            <span className="font-medium">{s.title}</span> - {s.time} | {s.speaker}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {eventDetails.tags && eventDetails.tags.length > 0 && (
                    <>
                      <h3 className="font-semibold text-white mt-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {eventDetails.tags.map((tag, idx) => (
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

              {/* Requirements */}
              {eventDetails.requirements && eventDetails.requirements.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Requirements</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    {eventDetails.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Event Information */}
              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <h3 className="text-lg font-semibold mb-3">Event Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Participants:</span>
                    <span className="font-medium">{eventDetails.participants || 0}</span>
                  </div>
                  {eventDetails.maxParticipants && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Participants:</span>
                      <span className="font-medium">{eventDetails.maxParticipants}</span>
                    </div>
                  )}
                  {eventDetails.fee !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Registration Fee:</span>
                      <span className="font-medium">
                        {eventDetails.fee > 0 ? `$${eventDetails.fee}` : 'Free'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Host Information */}
              {(eventDetails.hostUserId || eventDetails.organizer) && (
                <div className="bg-gray-800 rounded-lg p-4 mt-4">
                  <h3 className="text-lg font-semibold mb-3">Hosted By</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#9b5de5] rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {eventDetails.hostUserId?.name 
                          ? eventDetails.hostUserId.name.charAt(0).toUpperCase() 
                          : (eventDetails.organizer?.charAt(0)?.toUpperCase() || 'H')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {eventDetails.hostUserId?.name || eventDetails.organizer || 'Event Host'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {eventDetails.hostUserId?.email || ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRSVP}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
                    isRsvped
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-[#9b5de5] hover:bg-[#8a4fd3] text-white'
                  }`}
                >
                  {isRsvped ? 'Cancel RSVP' : 'Register for Event'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
