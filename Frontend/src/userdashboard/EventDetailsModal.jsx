import React, { useState, useEffect } from "react";
import ShareButton from "./ShareButton";
import { getEventById, rsvpEvent, cancelRsvp, getMyEventQrCode } from "../api/events";

const EventDetails = ({ event, onBack, onRSVP, isRsvped }) => {
  const [eventDetails, setEventDetails] = useState(event);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rsvped, setRsvped] = useState(event.userRegistration ? true : false);
  const [qrCodeImage, setQrCodeImage] = useState(null);
  const [qrCodeLoading, setQrCodeLoading] = useState(false);

  useEffect(() => {
    if (event._id) {
      loadEventDetails();
    }
  }, [event._id]);

  // Fetch QR code when event is registered
  useEffect(() => {
    if (eventDetails._id && rsvped) {
      fetchQrCode(eventDetails._id);
    } else {
      setQrCodeImage(null);
    }
  }, [eventDetails._id, rsvped]);

  const fetchQrCode = async (eventId) => {
    try {
      setQrCodeLoading(true);
      const response = await getMyEventQrCode(eventId);
      if (response.success && response.qrCode) {
        setQrCodeImage(response.qrCode.image);
      }
    } catch (err) {
      console.error('❌ Error loading QR code:', err);
      // Don't show error to user - QR code might be expired or used
    } finally {
      setQrCodeLoading(false);
    }
  };

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      const response = await getEventById(event._id);
      if (response.success && response.data) {
        setEventDetails(response.data);
        setRsvped(response.data.userRegistration ? true : false);
      }
    } catch (err) {
      console.error('Error loading event details:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    try {
      setLoading(true);
      
      let response;
      if (rsvped) {
        // Cancel RSVP
        response = await cancelRsvp(eventDetails._id || eventDetails.id);
        // Clear QR code on cancellation
        setQrCodeImage(null);
      } else {
        // Register for event
        response = await rsvpEvent(eventDetails._id || eventDetails.id);
        // Store QR code if provided
        if (response.success && response.data && response.data.qrImage) {
          setQrCodeImage(response.data.qrImage);
        }
      }
      
      if (response.success) {
        setRsvped(!rsvped);
        // Reload event details to update registration status
        setTimeout(() => {
          loadEventDetails();
        }, 500);
      } else {
        setError(response.message || response.error || 'RSVP action failed');
      }
    } catch (err) {
      console.error('RSVP error:', err);
      setError('RSVP action failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
  <div className="text-white bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl shadow-2xl overflow-hidden">
      {/* Banner Image at Top */}
      {(eventDetails.bannerURL || eventDetails.coverImage) && (
        <div className="relative">
          <img
            src={eventDetails.bannerURL || eventDetails.coverImage}
            alt={eventDetails.title}
            className="w-full h-32 sm:h-48 md:h-64 object-cover rounded-t-xl"
          />
          {/* Optional overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-t-xl"></div>
        </div>
      )}

      {/* Elegant Header without Banner */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-[#9b5de5]/20 to-[#7c3aed]/20 border-b border-gray-700/50">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            {eventDetails.logoURL && (
              <img
                src={eventDetails.logoURL}
                alt={eventDetails.organizationName || "Organization Logo"}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover border-2 border-white/20 shadow-lg"
              />
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white truncate mb-1">
                {eventDetails.title}
              </h2>
              {eventDetails.organizationName && (
                <span className="text-xs sm:text-sm text-gray-300 font-semibold mb-2">{eventDetails.organizationName}</span>
              )}
              <span
                className={`inline-block px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium rounded-full w-fit ${
                  status === "upcoming"
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : status === "ongoing"
                    ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                    : "bg-gray-500/20 text-gray-300 border border-gray-500/30"
                }`}
              >
                {status === "upcoming" ? "Upcoming" : status === "ongoing" ? "Ongoing" : "Past"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
            <ShareButton event={eventDetails} title={eventDetails.title} description={eventDetails.description} />
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white text-xl sm:text-2xl transition-colors"
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* Elegant Content Area */}
      <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
        {loading && (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-[#9b5de5] mx-auto mb-3 sm:mb-4"></div>
            <p className="text-gray-400 text-sm sm:text-lg">Loading event details...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-red-400 text-sm sm:text-lg">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mt-3 sm:mt-4 text-gray-300 text-xs sm:text-sm md:text-base">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Left column: Event Info */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-lg">
                    <h3 className="font-semibold text-white mb-2 sm:mb-3 text-base sm:text-lg">Event Details</h3>
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-lg sm:text-xl">📅</span>
                        <div className="text-xs sm:text-sm">
                          <span className="font-medium text-white">Date:</span> {formatDate(eventDetails.date)}{eventDetails.time ? ` at ${eventDetails.time}` : ''}
                        </div>
                      </div>
                      {eventDetails.endDate && (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-lg sm:text-xl">🏁</span>
                          <div className="text-xs sm:text-sm">
                            <span className="font-medium text-white">Ends:</span> {formatDate(eventDetails.endDate)}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-lg sm:text-xl">📍</span>
                        <div className="text-xs sm:text-sm">
                          <span className="font-medium text-white">Location:</span> {eventDetails.location?.venue || eventDetails.location?.type || eventDetails.venue || 'Location TBD'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-lg sm:text-xl">👥</span>
                        <div className="text-xs sm:text-sm">
                          <span className="font-medium text-white">Participants:</span> {eventDetails.participants || 0}
                        </div>
                      </div>
                      {(eventDetails.capacity || eventDetails.maxParticipants) && (
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-lg sm:text-xl">🏟️</span>
                          <div className="text-xs sm:text-sm">
                            <span className="font-medium text-white">Capacity:</span> {eventDetails.capacity || eventDetails.maxParticipants}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right column: About, Sessions, Tags */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-lg">
                    <h3 className="font-semibold text-white mb-2 sm:mb-3 text-base sm:text-lg">About</h3>
                    <p className="text-xs sm:text-sm md:text-base leading-relaxed">{eventDetails.description || 'No description available.'}</p>
                  </div>

                  {eventDetails.sessions && eventDetails.sessions.length > 0 && (
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-lg">
                      <h3 className="font-semibold text-white mb-2 sm:mb-3 text-base sm:text-lg">Sessions</h3>
                      <ul className="list-disc list-inside text-xs sm:text-sm md:text-base space-y-1 sm:space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                        {eventDetails.sessions.map((s, i) => (
                          <li key={i} className="leading-relaxed">
                            <span className="font-medium text-white">{s.title}</span> - {s.time} | {s.speaker}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {eventDetails.tags && eventDetails.tags.length > 0 && (
                    <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-lg">
                      <h3 className="font-semibold text-white mb-2 sm:mb-3 text-base sm:text-lg">Tags</h3>
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {eventDetails.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-gradient-to-r from-[#9b5de5] to-[#7c3aed] text-white px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium rounded-full shadow-sm hover:shadow-md transition-shadow"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements (expandable if long) */}
              {eventDetails.requirements && eventDetails.requirements.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <h4 className="font-semibold mb-2 sm:mb-3 flex items-center gap-2 text-base sm:text-lg">
                    <span className="text-lg sm:text-xl">📝</span> Requirements
                  </h4>
                  <details className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-700/30 shadow-lg">
                    <summary className="cursor-pointer text-gray-300 hover:text-white transition-colors text-sm sm:text-base">View requirements</summary>
                    <ul className="list-disc list-inside space-y-1 sm:space-y-2 text-gray-300 mt-2 sm:mt-3 text-xs sm:text-sm">
                      {eventDetails.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}

              {/* Event Information: only show if there's fee or enabled features */}
              {(eventDetails.fee !== undefined || (eventDetails.features && (eventDetails.features.certificateEnabled || eventDetails.features.chatEnabled))) && (
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 sm:p-4 mt-4 sm:mt-6 border border-gray-700/30 shadow-lg">
                  <div className="space-y-2 sm:space-y-3">
                    {eventDetails.fee !== undefined && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="text-gray-400 flex items-center gap-2 text-sm sm:text-base"><span className="text-base sm:text-lg">💸</span>Registration Fee:</span>
                        <span className="font-medium text-white text-sm sm:text-base">
                          {eventDetails.fee > 0 ? `$${eventDetails.fee}` : 'Free'}
                        </span>
                      </div>
                    )}
                    {/* Features: only show if enabled */}
                    {eventDetails.features && eventDetails.features.certificateEnabled && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="text-gray-400 flex items-center gap-2 text-sm sm:text-base"><span className="text-base sm:text-lg">🎓</span>Certificate:</span>
                        <span className="font-medium text-green-400 text-sm sm:text-base">Enabled</span>
                      </div>
                    )}
                    {eventDetails.features && eventDetails.features.chatEnabled && (
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0">
                        <span className="text-gray-400 flex items-center gap-2 text-sm sm:text-base"><span className="text-base sm:text-lg">💬</span>Chat:</span>
                        <span className="font-medium text-green-400 text-sm sm:text-base">Enabled</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Host Information Card: show name, email, phone if available; hide if not */}
              {eventDetails.hostUserId && (eventDetails.hostUserId.name || eventDetails.hostUserId.email || eventDetails.hostUserId.phone) && (
                <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-3 sm:p-4 mt-4 sm:mt-6 border border-gray-700/30 shadow-lg">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="text-lg sm:text-xl">🧑‍💼</span> Hosted By
                  </h3>
                  <div className="flex items-center gap-3 sm:gap-4">
                    {eventDetails.logoURL ? (
                      <img
                        src={eventDetails.logoURL}
                        alt={eventDetails.organizationName || "Organization Logo"}
                        className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-white/20 shadow-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#9b5de5] rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-semibold text-sm sm:text-lg">
                          {eventDetails.hostUserId?.name 
                            ? eventDetails.hostUserId.name.charAt(0).toUpperCase() 
                            : 'H'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {eventDetails.hostUserId.name && (
                        <p className="font-medium text-white text-sm sm:text-lg truncate">{eventDetails.hostUserId.name}</p>
                      )}
                      {eventDetails.hostUserId.email && (
                        <p className="text-gray-400 text-xs sm:text-sm truncate">{eventDetails.hostUserId.email}</p>
                      )}
                      {eventDetails.hostUserId.phone && (
                        <p className="text-gray-400 text-xs sm:text-sm truncate">{eventDetails.hostUserId.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code Section - Show only for registered users */}
              {rsvped && (
                <div className="mt-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="text-lg sm:text-xl">🎫</span> Your Event QR Code
                  </h3>
                  <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/30 shadow-lg">
                    {qrCodeLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9b5de5] mx-auto"></div>
                        <p className="text-gray-400 mt-4 text-sm">Loading QR Code...</p>
                      </div>
                    ) : qrCodeImage ? (
                      <div className="text-center">
                        <img 
                          src={qrCodeImage} 
                          alt="Event QR Code" 
                          className="mx-auto mb-4 bg-white p-4 rounded-lg"
                          style={{ maxWidth: '250px', width: '100%' }}
                        />
                        <p className="text-gray-300 text-sm mb-2">
                          ✅ Present this QR code at the event entrance
                        </p>
                        <p className="text-gray-400 text-xs">
                          💡 Save this code or check your email for a copy
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm">
                          ⚠️ QR code not available. Please check your email or contact support.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                <button
                  onClick={handleRSVP}
                  className={`flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-bold text-sm sm:text-lg shadow-lg transition-all duration-200 ${
                    rsvped
                      ? 'bg-red-600 hover:bg-red-700 text-white hover:shadow-red-500/25'
                      : 'bg-gradient-to-r from-[#9b5de5] to-[#7c3aed] hover:from-[#8a4fd3] hover:to-[#6b21a8] text-white hover:shadow-purple-500/25'
                  }`}
                  disabled={loading}
                >
                  {rsvped ? 'Cancel RSVP' : 'Register for Event'}
                </button>
              </div>

              {/* Social Links Section */}
              {eventDetails.socialLinks && (eventDetails.socialLinks.website || eventDetails.socialLinks.linkedin) && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 mt-4 sm:mt-6 items-center justify-center">
                  <span className="text-gray-400 text-xs sm:text-sm">Connect with us:</span>
                  <div className="flex gap-3 sm:gap-6">
                    {eventDetails.socialLinks.website && (
                      <a href={eventDetails.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                        <span className="text-sm sm:text-lg">🌐</span> Website
                      </a>
                    )}
                    {eventDetails.socialLinks.linkedin && (
                      <a href={eventDetails.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                        <span className="text-sm sm:text-lg">🔗</span> LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
