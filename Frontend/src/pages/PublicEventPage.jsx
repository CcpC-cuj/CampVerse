import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventById } from "../api/events";

const PublicEventPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const response = await getEventById(eventId);
        if (response.success) {
          setEvent(response.event);
        } else {
          setError(response.message || 'Event not found');
        }
      } catch (err) {
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-white text-xl">Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-white text-2xl mb-4">{error || 'Event not found'}</h2>
          <button 
            onClick={() => navigate('/')} 
            className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Banner */}
      <div className="relative h-96 bg-gradient-to-r from-purple-900 to-blue-900">
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
              <img src={event.logoURL} alt="Event Logo" className="w-32 h-32 rounded-full border-4 border-purple-500 object-cover" />
            )}
            <div className="flex-1">
              <h1 className="text-5xl font-bold text-white mb-4">{event.title}</h1>
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
                  {event.location?.type || 'Online'}
                </span>
                {event.features?.certificateEnabled && (
                  <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                    🏆 Certificate Available
                  </span>
                )}
              </div>
              <p className="text-purple-300 text-xl leading-relaxed">{event.description}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8 pb-8 border-b border-purple-600/30">
            <button 
              onClick={() => navigate('/login')} 
              className="px-8 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              📝 Register for Event
            </button>
            <button 
              onClick={handleShare} 
              className="px-8 py-3 bg-purple-700/30 hover:bg-purple-700/50 text-purple-300 rounded-lg font-semibold text-lg transition-colors"
            >
              🔗 Share Event
            </button>
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
                <p className="text-white text-lg capitalize">{event.location?.type || 'N/A'}</p>
                {event.location?.venue && (
                  <p className="text-purple-300 mt-2">Venue: {event.location.venue}</p>
                )}
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
                  {event.capacity ? `${event.capacity} participants` : 'Unlimited'}
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

              {event.type && (
                <div className="bg-purple-900/20 p-6 rounded-lg border border-purple-500/30">
                  <h3 className="text-purple-300 font-semibold text-lg mb-3">📂 Category</h3>
                  <p className="text-white text-lg">{event.type}</p>
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
    </div>
  );
};

export default PublicEventPage;
