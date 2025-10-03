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
    const d = new Date(dateString);
    const year = d.getFullYear();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const day = d.getDate();
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} at ${hours}:${formattedMinutes} ${ampm}`;
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
      {/* Modal Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Event Details</h2>
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ✕
        </button>
      </div>

      {/* Modal Content */}
      <div className="p-6 max-h-96 overflow-y-auto">
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
          <div className="space-y-6">
            {/* Event Image */}
            {eventDetails.coverImage && (
              <div className="relative">
                <img
                  src={eventDetails.coverImage}
                  alt={eventDetails.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Event Title and Status */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{eventDetails.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === 'upcoming' ? 'bg-blue-600 text-blue-100' :
                  status === 'ongoing' ? 'bg-green-600 text-green-100' :
                  'bg-gray-600 text-gray-100'
                }`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            </div>

            {/* Event Date and Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[#9b5de5]">📅</span>
                <span className="font-medium">
                  {formatDate(eventDetails.date)}
                </span>
              </div>
              {eventDetails.endDate && (
                <div className="flex items-center gap-2">
                  <span className="text-[#9b5de5]">🏁</span>
                  <span>Ends: {formatDate(eventDetails.endDate)}</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div className="flex items-center gap-2">
              <span className="text-[#9b5de5]">📍</span>
              <span>
                {eventDetails.location?.venue || eventDetails.venue || 'Location TBD'}
                {eventDetails.location?.type && (
                  <span className="ml-2 text-sm text-gray-400">
                    ({eventDetails.location.type})
                  </span>
                )}
              </span>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold mb-3">About This Event</h3>
              <p className="text-gray-300 leading-relaxed">
                {eventDetails.description || 'No description available.'}
              </p>
            </div>

            {/* Event Tags */}
            {eventDetails.tags && eventDetails.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {eventDetails.tags.map((tag, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 bg-[#9b5de5] bg-opacity-20 text-[#9b5de5] rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Event Information */}
            <div className="bg-gray-800 rounded-lg p-4">
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
              <div className="bg-gray-800 rounded-lg p-4">
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

            {/* Requirements */}
            {eventDetails.requirements && eventDetails.requirements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                <ul className="space-y-1">
                  {eventDetails.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#9b5de5] mt-1">•</span>
                      <span className="text-gray-300">{req}</span>
                    </li>
                  ))}
                </ul>
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
        )}
      </div>
    </div>
  );
};

export default EventDetails;
