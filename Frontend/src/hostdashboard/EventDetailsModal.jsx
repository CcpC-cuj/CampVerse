import React, { useState, useEffect } from "react";
import { getEventById } from "../api/events";
import { useNavigate } from "react-router-dom";

const EventDetailsModal = ({ event, onClose }) => {
  const navigate = useNavigate();
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

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const year = d.getUTCFullYear();
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const day = d.getUTCDate();
    let hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-700">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Event Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* Modal Content */}
      <div className="flex-1 overflow-auto p-6">
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
            {/* Event Banner */}
            {(eventDetails.bannerURL || eventDetails.bannerImage || eventDetails.cover || eventDetails.coverImage) && (
              <div className="relative">
                <img
                  src={eventDetails.bannerURL || eventDetails.bannerImage || eventDetails.cover || eventDetails.coverImage}
                  alt={eventDetails.title}
                  className="w-full h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Event Title and Status */}
            <div className="flex items-center justify-between">
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
              {/* Event Logo */}
              {(eventDetails.logoURL || eventDetails.logo) && (
                <div className="flex-shrink-0">
                  <img
                    src={eventDetails.logoURL || eventDetails.logo}
                    alt="Event Logo"
                    className="w-16 h-16 object-contain rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[#9b5de5]">📍</span>
                <div>
                  <span>
                    {eventDetails.location?.venue || eventDetails.venue || 
                     (eventDetails.location?.type === 'online' ? 'Online Event' : 'Location TBD')}
                    {eventDetails.location?.type && eventDetails.location?.venue && (
                      <span className="ml-2 text-sm text-gray-400">
                        ({eventDetails.location.type})
                      </span>
                    )}
                  </span>
                  {/* Show online link if location type is online and link exists */}
                  {eventDetails.location?.type === 'online' && (eventDetails.location?.link || eventDetails.onlineLink) && (
                    <div className="mt-1">
                      <a 
                        href={eventDetails.location?.link || eventDetails.onlineLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Join Online
                      </a>
                    </div>
                  )}
                </div>
              </div>
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
                      className="px-3 py-1 bg-[#9b5de5]/20 text-[#c77dff] border border-[#9b5de5]/30 rounded-full text-sm font-medium"
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
            {(eventDetails.hostUserId || eventDetails.organizer || eventDetails.host) && (
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Hosted By</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#9b5de5] rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {eventDetails.hostUserId?.name 
                        ? eventDetails.hostUserId.name.charAt(0).toUpperCase() 
                        : (typeof eventDetails.organizer === 'object' && eventDetails.organizer?.name)
                          ? eventDetails.organizer.name.charAt(0).toUpperCase()
                          : (typeof eventDetails.organizer === 'string' && eventDetails.organizer)
                            ? eventDetails.organizer.charAt(0).toUpperCase()
                            : eventDetails.host?.name?.charAt(0)?.toUpperCase() || 'H'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {eventDetails.hostUserId?.name || 
                       (typeof eventDetails.organizer === 'object' ? eventDetails.organizer?.name : eventDetails.organizer) ||
                       eventDetails.host?.name || 'Event Host'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {eventDetails.hostUserId?.email || 
                       (typeof eventDetails.organizer === 'object' ? eventDetails.organizer?.email : '') ||
                       eventDetails.host?.email || ''}
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

            {/* Action Buttons - Host Dashboard Actions */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => navigate(`/host/events/${eventDetails._id}/qr-scanner`)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR Scanner
              </button>

              <button
                onClick={() => navigate(`/host/events/${eventDetails._id}/attendance`)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Attendance
              </button>

              <button
                onClick={() => navigate(`/host/events/${eventDetails._id}/bulk-attendance`)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Bulk Attendance
              </button>

              {(eventDetails.features?.certificateEnabled || eventDetails.certificateEnabled) && (
                <button
                  onClick={() => {
                    onClose();
                    // Navigate to certificate management page
                    navigate(`/host/events/${eventDetails._id}/certificates`);
                  }}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Certificates
                </button>
              )}

              <button
                onClick={() => {
                  onClose();
                  // Navigate back to events management for editing
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('editEvent', { detail: { event: eventDetails } }));
                  }, 100);
                }}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Event
              </button>

              <button
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default EventDetailsModal;
