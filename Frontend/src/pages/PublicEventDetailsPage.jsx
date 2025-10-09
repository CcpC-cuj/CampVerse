import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicEventById, rsvpEvent, cancelRsvp, getMyEventQrCode } from '../api/events';
import { useAuth } from '../contexts/AuthContext';
import ShareButton from '../userdashboard/ShareButton';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import Chatbot from '../components/Chatbot';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRsvped, setIsRsvped] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(null); // 'registered' or 'waitlisted'
  const [qrCodeImage, setQrCodeImage] = useState(null); // Store QR code image
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [rsvpError, setRsvpError] = useState("");
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPublicEventById(id);
      if (response.success && response.data) {
        setEvent(response.data);
        // Check if user is already registered
        const isRegistered = response.data.userRegistration ? true : false;
        setIsRsvped(isRegistered);
        // Store registration status (registered or waitlisted)
        if (response.data.userRegistration) {
          setRegistrationStatus(response.data.userRegistration.status);
          // If user is registered, fetch their QR code
          if (response.data.userRegistration.status === 'registered') {
            fetchQrCode();
          }
        } else {
          setRegistrationStatus(null);
        }
      } else {
        setError('Event not found');
      }
    } catch (err) {
      console.error('❌ Error loading event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchQrCode = async () => {
    if (!user) return;
    
    try {
      setQrCodeLoading(true);
      const response = await getMyEventQrCode(id);
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

  const handleRSVP = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setRsvpLoading(true);
    setRsvpError("");
    
    try {
      const response = await rsvpEvent(id);
      
      if (response.success) {
        // Store QR code if provided
        if (response.data && response.data.qrImage) {
          setQrCodeImage(response.data.qrImage);
        }
        
        // Success - reload event data to get updated registration status
        await loadEvent();
        setRsvpError("");
        
        // Show success message based on status
        if (response.status === 'registered') {
          alert('✅ Successfully registered for the event! Check your email for QR code.');
        } else if (response.status === 'waitlisted') {
          alert('⏳ You have been added to the waitlist. You will be notified if a spot opens up.');
        }
      } else {
        // Error - still reload to sync state
        await loadEvent();
        
        // Handle specific error cases
        if (response.status === 409 || response.error?.includes("already registered")) {
          setRsvpError("You are already registered for this event.");
        } else {
          setRsvpError(response.message || response.error || "RSVP failed. Please try again.");
        }
      }
    } catch (err) {
      console.error('❌ RSVP error:', err);
      // Reload event even on error to ensure sync
      await loadEvent();
      setRsvpError("RSVP failed. Please try again.");
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRSVP = async () => {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel your registration? This action cannot be undone.'
    );
    
    if (!confirmed) {
      return;
    }

    setRsvpLoading(true);
    setRsvpError("");
    
    try {
      const response = await cancelRsvp(id);
      
      if (response.success) {
        // Clear QR code on successful cancellation
        setQrCodeImage(null);
        // Success - reload event data
        await loadEvent();
        setRsvpError("");
        alert('✅ Your registration has been cancelled successfully.');
      } else {
        // Error - still reload to sync state
        await loadEvent();
        setRsvpError(response.message || response.error || "Failed to cancel RSVP. Please try again.");
      }
    } catch (err) {
      console.error('❌ Cancel RSVP error:', err);
      // Reload event even on error to ensure sync
      await loadEvent();
      setRsvpError("Failed to cancel RSVP. Please try again.");
    } finally {
      setRsvpLoading(false);
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


  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading event...</div>
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-2xl mb-4">{error}</h2>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg shadow-lg transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  if (!event)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-white text-xl">Event not found</div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Banner */}
      <div className="relative h-80 md:h-96 bg-gradient-to-r from-purple-900 to-blue-900">
        {event.bannerURL && (
          <img src={event.bannerURL} alt="Event Banner" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c29] to-transparent"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 -mt-32 relative z-10 pb-16">
        <div className="bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
          {/* Event Header */}
          <div className="flex items-start gap-6 mb-8">
            {event.logoURL && (
              <img src={event.logoURL} alt="Event Logo" className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-purple-500 object-cover" />
            )}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{event.title}</h1>
              <div className="flex flex-wrap gap-2 mb-4">
                {event.isPaid ? (
                  <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-medium">
                    ₹{event.price}
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                    Free Event
                  </span>
                )}
                <span className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium capitalize">
                  {event.location?.type || "Online"}
                </span>
                {event.features?.certificateEnabled && (
                  <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                    🏆 Certificate Available
                  </span>
                )}
              </div>
              <p className="text-purple-300 text-lg md:text-xl leading-relaxed">{event.description}</p>
            </div>
            <ShareButton event={event} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b border-purple-600/30">
            {/* Show RSVP error if any */}
            {rsvpError && (
              <div className="w-full mb-2 text-center">
                <span className="text-red-400 bg-red-900/30 px-4 py-2 rounded-lg font-medium">{rsvpError}</span>
              </div>
            )}
            
            {/* Show login button if user is not logged in */}
            {!user && (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-md"
              >
                📝 Login to Register
              </button>
            )}
            
            {/* Show registration/cancellation buttons if user is logged in and event is approved */}
            {user && event.verificationStatus === "approved" && (
              <>
                {!isRsvped ? (
                  // Not registered - show Register button
                  <button
                    onClick={handleRSVP}
                    disabled={rsvpLoading}
                    className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-md ${
                      rsvpLoading
                        ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {rsvpLoading ? "⏳ Processing..." : "📝 Register for Event"}
                  </button>
                ) : (
                  // Already registered - show status badge and cancel button
                  <>
                    <div className="flex items-center gap-3 px-6 py-3 bg-green-700/20 border border-green-500 rounded-lg">
                      <span className="text-green-300 font-semibold text-lg">
                        {registrationStatus === 'registered' ? '✅ Registered' : '⏳ Waitlisted'}
                      </span>
                      {registrationStatus === 'registered' && (
                        <span className="text-green-200 text-sm">(Check your email for QR code)</span>
                      )}
                    </div>
                    <button
                      onClick={handleCancelRSVP}
                      disabled={rsvpLoading}
                      className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-md ${
                        rsvpLoading
                          ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      {rsvpLoading ? "⏳ Cancelling..." : "❌ Cancel Registration"}
                    </button>
                    
                    {/* View QR Code button for registered users */}
                    {registrationStatus === 'registered' && (
                      <button
                        onClick={() => navigate(`/events/${id}/qr`)}
                        className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-md"
                      >
                        🎫 View QR Code
                      </button>
                    )}
                  </>
                )}
              </>
            )}
            
            {/* Show message if event is pending approval */}
            {user && event.verificationStatus !== "approved" && (
              <div className="w-full text-center">
                <span className="text-yellow-400 bg-yellow-900/30 px-4 py-2 rounded-lg font-medium">
                  ⏳ This event is pending approval. Registration will open once approved.
                </span>
              </div>
            )}
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-6">
              <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                <h3 className="text-purple-300 font-semibold text-lg mb-3">📅 Date & Time</h3>
                <p className="text-white text-lg">{formatDate(event.date)}</p>
              </div>

              <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                <h3 className="text-purple-300 font-semibold text-lg mb-3">📍 Location</h3>
                <p className="text-white text-lg capitalize">{event.location?.venue || "N/A"}</p>
                {event.location?.link && (
                  <a
                    href={event.location.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 mt-2 block"
                  >
                    🔗 Join Online
                  </a>
                )}
              </div>

              <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                <h3 className="text-purple-300 font-semibold text-lg mb-3">👥 Capacity</h3>
                <p className="text-white text-lg">
                  {event.capacity ? `${event.capacity} participants` : "Unlimited"}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {event.organizationName && (
                <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                  <h3 className="text-purple-300 font-semibold text-lg mb-3">🏢 Organization</h3>
                  <p className="text-white text-lg">{event.organizationName}</p>
                </div>
              )}

              {event.category && (
                <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                  <h3 className="text-purple-300 font-semibold text-lg mb-3">📂 Category</h3>
                  <p className="text-white text-lg">{event.category}</p>
                </div>
              )}

              {event.tags && event.tags.length > 0 && (
                <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                  <h3 className="text-purple-300 font-semibold text-lg mb-3">🏷️ Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-purple-700/30 text-purple-300 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          {event.requirements && event.requirements.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📝 Requirements</h2>
              <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                <ul className="space-y-2">
                  {event.requirements.map((req, idx) => (
                    <li key={idx} className="text-white text-lg">• {req}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* About Section */}
          {event.about && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">ℹ️ About This Event</h2>
              <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                <p className="text-white text-lg leading-relaxed whitespace-pre-wrap">{event.about}</p>
              </div>
            </div>
          )}

          {/* Sessions */}
          {event.sessions && event.sessions.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-4">📋 Event Sessions</h2>
              <div className="space-y-3">
                {event.sessions.map((session, idx) => (
                  <div key={idx} className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                    <h4 className="text-white font-semibold text-xl mb-2">{session.title}</h4>
                    <p className="text-purple-300">🕒 {session.time}</p>
                    <p className="text-purple-300">👤 {session.speaker}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Links */}
          {event.socialLinks && (event.socialLinks.website || event.socialLinks.linkedin) && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">🔗 Connect With Us</h2>
              <div className="flex gap-4">
                {event.socialLinks.website && (
                  <a
                    href={event.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-medium transition-colors"
                  >
                    🌐 Website
                  </a>
                )}
                {event.socialLinks.linkedin && (
                  <a
                    href={event.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors"
                  >
                    💼 LinkedIn
                  </a>
                )}
              </div>
            </div>
          )}

          {/* QR Code Section - Show only for registered users */}
          {isRsvped && registrationStatus === 'registered' && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-white mb-4">🎫 Your Event QR Code</h2>
              <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                {qrCodeLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-purple-300 mt-4">Loading QR Code...</p>
                  </div>
                ) : qrCodeImage ? (
                  <div className="text-center">
                    <img 
                      src={qrCodeImage} 
                      alt="Event QR Code" 
                      className="mx-auto mb-4 bg-white p-4 rounded-lg"
                      style={{ maxWidth: '300px', width: '100%' }}
                    />
                    <p className="text-purple-300 text-sm mb-2">
                      ✅ Present this QR code at the event entrance
                    </p>
                    <p className="text-purple-400 text-xs">
                      💡 Save this code or check your email for a copy
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-purple-300">
                      ⚠️ QR code not available. Please check your email or contact support.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSwitchToSignup={() => {
            setShowLoginModal(false);
            setShowSignupModal(true);
          }}
        />
      )}
      {showSignupModal && (
        <SignupModal onClose={() => setShowSignupModal(false)} />
      )}
      <Chatbot />
    </div>
  );
};

export default EventDetailsPage;