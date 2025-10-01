import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicEventById, rsvpEvent, cancelRsvp } from '../api/events';
import { useAuth } from '../contexts/AuthContext';
import ShareButton from '../userdashboard/ShareButton';
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRsvped, setIsRsvped] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await getPublicEventById(id);
      if (response.success && response.data) {
        setEvent(response.data);
        // Check if user is already registered
        setIsRsvped(response.data.userRegistration ? true : false);
      } else {
        setError('Event not found');
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    try {
      const response = isRsvped ? await cancelRsvp(id) : await rsvpEvent(id);
      if (response.success) {
        setIsRsvped(!isRsvped);
          // RSVP ${isRsvped ? 'cancelled' : 'successful'}! (alert removed)
      } else {
          // RSVP failed (alert removed)
      }
    } catch (err) {
      console.error('RSVP error:', err);
        // Error processing RSVP (alert removed)
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
            <button
              onClick={() => navigate(-1)}
              className="px-8 py-3 bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-semibold text-lg transition-colors shadow-md"
            >
              ⬅️ Back
            </button>
            {/* Show login button if user is not logged in */}
            {!user && (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg transition-colors shadow-md"
              >
                📝 Login to Register
              </button>
            )}
            {user && event.verificationStatus === "approved" && (
              <button
                onClick={handleRSVP}
                className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-md ${
                  isRsvped
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isRsvped ? "Cancel Registration" : "Register for Event"}
              </button>
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
    </div>
  );
};

export default EventDetailsPage;