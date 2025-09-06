import React, { useState, useEffect } from "react";
import { getEventById, getEventParticipants } from "../api/events";

const EventDetails = ({ event, onBack, onRSVP, isRsvped }) => {
  const [eventDetails, setEventDetails] = useState(event);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);

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

  const loadParticipants = async () => {
    try {
      const response = await getEventParticipants(event._id);
      if (response.success && response.data) {
        setParticipants(response.data.participants || []);
        setShowParticipants(true);
      }
    } catch (err) {
      console.error('Error loading participants:', err);
      alert('Failed to load participants');
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
    if (!eventDetails.date) return 'unknown';
    
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

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b5de5]"></div>
          <span className="ml-3 text-gray-400">Loading event details...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 m-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!loading && (
        <div className="p-4">
          {/* Event Cover Image */}
          {(eventDetails.coverImage || eventDetails.image) && (
            <div className="relative mb-6">
              <img
                src={eventDetails.coverImage || eventDetails.image}
                alt={eventDetails.title}
                className="w-full h-64 object-cover rounded-lg"
              />
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === 'upcoming' 
                    ? 'bg-green-900 text-green-300' 
                    : status === 'ongoing'
                    ? 'bg-blue-900 text-blue-300'
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  {status === 'upcoming' ? 'Upcoming' : 
                   status === 'ongoing' ? 'Ongoing' : 'Past'}
                </span>
              </div>
            </div>
          )}

          {/* Event Title and Basic Info */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">{eventDetails.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-300">
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>{formatDate(eventDetails.date)}</span>
              </div>
              {eventDetails.endDate && (
                <div className="flex items-center gap-2">
                  <span>🏁</span>
                  <span>Ends: {formatDate(eventDetails.endDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>📍</span>
                <span>{eventDetails.location || 'Location TBD'}</span>
              </div>
            </div>
          </div>

          {/* Event Description */}
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-3">About This Event</h3>
            <p className="text-gray-300 leading-relaxed">
              {eventDetails.description || 'No description available.'}
            </p>
          </div>

          {/* Event Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Event Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Participants:</span>
                  <span>{eventDetails.participants || 0}</span>
                </div>
                {eventDetails.maxParticipants && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Participants:</span>
                    <span>{eventDetails.maxParticipants}</span>
                  </div>
                )}
                {eventDetails.fee !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fee:</span>
                    <span>{eventDetails.fee === 0 ? 'Free' : `$${eventDetails.fee}`}</span>
                  </div>
                )}
              </div>
            </div>

            {eventDetails.organizer && (
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Hosted By</h4>
                <div className="text-sm">
                  <p className="font-medium">{eventDetails.organizer.name || 'Event Organizer'}</p>
                  {eventDetails.organizer.email && (
                    <p className="text-gray-400">{eventDetails.organizer.email}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {eventDetails.tags && eventDetails.tags.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {eventDetails.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-[#9b5de5] bg-opacity-20 text-[#9b5de5] text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
            {status === 'upcoming' && (
              <button
                onClick={handleRSVP}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isRsvped
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#9b5de5] hover:bg-[#8c4be1] text-white'
                }`}
              >
                {isRsvped ? 'Cancel Registration' : 'Register for Event'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;
