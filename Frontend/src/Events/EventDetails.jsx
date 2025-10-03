import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

const EventDetails = ({ event, onClose, onEdit, onRSVP, onCancelRSVP, onVerify, onApproveCoHost, onRejectCoHost }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('details');
  
  if (!event) return null;

  const isHost = user && (event.hostUserId === user.id || event.hostUserId?._id === user.id);
  const isCoHost = user && event.coHosts?.some(cohost => cohost === user.id || cohost?._id === user.id);
  const isVerifier = user && user.roles?.includes('verifier');
  const isPlatformAdmin = user && user.roles?.includes('platformAdmin');
  const canEdit = isHost || isCoHost || isPlatformAdmin;
  const canVerify = isVerifier || isPlatformAdmin;
  
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const day = d.getDate();
    const weekday = d.toLocaleString('en-US', { weekday: 'long' });
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${weekday}, ${month} ${day}, ${year} at ${hours}:${formattedMinutes} ${ampm}`;
  };

  const getStatusBadge = (status) => {
    const colors = {
      upcoming: 'bg-blue-500/20 text-blue-300',
      ongoing: 'bg-green-500/20 text-green-300',
      completed: 'bg-gray-500/20 text-gray-300',
      pending: 'bg-yellow-500/20 text-yellow-300',
      approved: 'bg-green-500/20 text-green-300',
      rejected: 'bg-red-500/20 text-red-300'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-[rgba(21,23,41,0.95)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with Banner */}
        <div className="relative h-48 bg-gradient-to-r from-purple-900 to-blue-900">
          {event.bannerURL && (
            <img src={event.bannerURL} alt="Event Banner" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(21,23,41,0.95)] to-transparent"></div>
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-12rem)]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9b5de5 rgba(255,255,255,0.1)' }}>
          {/* Event Title and Logo */}
          <div className="flex items-start gap-6 mb-6">
            {event.logoURL && (
              <img src={event.logoURL} alt="Event Logo" className="w-24 h-24 rounded-full border-4 border-purple-500 object-cover" />
            )}
            <div className="flex-1">
              <h2 className="text-4xl font-bold text-white mb-2">{event.title}</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(event.status)}`}>
                  {event.status || 'upcoming'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(event.verificationStatus)}`}>
                  {event.verificationStatus || 'pending'} verification
                </span>
                {event.isPaid && (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm font-medium">
                    ₹{event.price}
                  </span>
                )}
                {!event.isPaid && (
                  <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm font-medium">
                    Free
                  </span>
                )}
              </div>
              <p className="text-purple-300 text-lg">{event.description}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-purple-600/30">
            {canEdit && (
              <button onClick={() => onEdit && onEdit(event)} className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-medium transition-colors">
                ✏️ Edit Event
              </button>
            )}
            {canVerify && event.verificationStatus === 'pending' && (
              <button onClick={() => onVerify && onVerify(event._id)} className="px-6 py-2 bg-green-700 hover:bg-green-800 text-white rounded-lg font-medium transition-colors">
                ✅ Verify Event
              </button>
            )}
            {!isHost && !isCoHost && user && event.verificationStatus === 'approved' && (
              <button onClick={() => onRSVP && onRSVP(event._id)} className="px-6 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-medium transition-colors">
                📝 RSVP / Register
              </button>
            )}
            {!isHost && !isCoHost && user && event.userRegistration && (
              <button onClick={() => onCancelRSVP && onCancelRSVP(event._id)} className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium transition-colors">
                ❌ Cancel RSVP
              </button>
            )}
            <button onClick={() => navigator.clipboard.writeText(window.location.href)} className="px-6 py-2 bg-purple-700/30 hover:bg-purple-700/50 text-purple-300 rounded-lg font-medium transition-colors">
              🔗 Share Event
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-purple-600/30">
            {['details', 'sessions', 'cohosts', 'requirements'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-purple-500'
                    : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Info */}
                <div className="space-y-4">
                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h3 className="text-purple-300 font-semibold mb-2">📅 Date & Time</h3>
                    <p className="text-white">{formatDate(event.date)}</p>
                  </div>
                  
                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h3 className="text-purple-300 font-semibold mb-2">📍 Location</h3>
                    <p className="text-white capitalize">{event.location?.type || 'N/A'}</p>
                    {event.location?.venue && (
                      <p className="text-purple-300 text-sm mt-1">Venue: {event.location.venue}</p>
                    )}
                    {event.location?.link && (
                      <a href={event.location.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm mt-1 block">
                        🔗 Join Online
                      </a>
                    )}
                  </div>

                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h3 className="text-purple-300 font-semibold mb-2">👥 Capacity</h3>
                    <p className="text-white">
                      {event.capacity ? `${event.capacity} participants` : 'Unlimited'}
                    </p>
                    {event.waitlist && event.waitlist.length > 0 && (
                      <p className="text-purple-300 text-sm mt-1">Waitlist: {event.waitlist.length}</p>
                    )}
                  </div>

                  <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                    <h3 className="text-purple-300 font-semibold mb-2">🎯 Audience</h3>
                    <p className="text-white capitalize">{event.audienceType || 'Public'}</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  {event.organizationName && (
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                      <h3 className="text-purple-300 font-semibold mb-2">🏢 Organization</h3>
                      <p className="text-white">{event.organizationName}</p>
                    </div>
                  )}

                  {event.type && (
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                      <h3 className="text-purple-300 font-semibold mb-2">📂 Category</h3>
                      <p className="text-white">{event.type}</p>
                    </div>
                  )}

                  {event.tags && event.tags.length > 0 && (
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                      <h3 className="text-purple-300 font-semibold mb-2">🏷️ Tags</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {event.tags.map(tag => (
                          <span key={tag} className="px-3 py-1 bg-purple-700/30 text-purple-300 rounded-full text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {event.about && (
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                      <h3 className="text-purple-300 font-semibold mb-2">ℹ️ About</h3>
                      <p className="text-white whitespace-pre-wrap">{event.about}</p>
                    </div>
                  )}

                  {event.features && (
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                      <h3 className="text-purple-300 font-semibold mb-2">✨ Features</h3>
                      <div className="space-y-1">
                        {event.features.certificateEnabled && (
                          <p className="text-white">🏆 Certificates Available</p>
                        )}
                        {event.features.chatEnabled && (
                          <p className="text-white">💬 Chat System Enabled</p>
                        )}
                      </div>
                    </div>
                  )}

                  {event.socialLinks && (event.socialLinks.website || event.socialLinks.linkedin) && (
                    <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                      <h3 className="text-purple-300 font-semibold mb-2">🔗 Links</h3>
                      <div className="space-y-1">
                        {event.socialLinks.website && (
                          <a href={event.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 block">
                            🌐 Website
                          </a>
                        )}
                        {event.socialLinks.linkedin && (
                          <a href={event.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 block">
                            💼 LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-3">
                {event.sessions && event.sessions.length > 0 ? (
                  event.sessions.map((session, idx) => (
                    <div key={idx} className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/30">
                      <h4 className="text-white font-semibold text-lg">{session.title}</h4>
                      <p className="text-purple-300 text-sm mt-1">🕒 {session.time}</p>
                      <p className="text-purple-300 text-sm">👤 {session.speaker}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-purple-400">No sessions scheduled yet.</p>
                )}
              </div>
            )}

            {activeTab === 'cohosts' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-purple-300 font-semibold mb-3">👥 Co-hosts</h3>
                  {event.coHosts && event.coHosts.length > 0 ? (
                    <div className="space-y-2">
                      {event.coHosts.map((cohost, idx) => (
                        <div key={idx} className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30">
                          <p className="text-white">{cohost.name || cohost.email || cohost}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-purple-400">No co-hosts assigned.</p>
                  )}
                </div>

                {(canVerify || isPlatformAdmin) && event.coHostRequests && event.coHostRequests.length > 0 && (
                  <div>
                    <h3 className="text-purple-300 font-semibold mb-3">📋 Co-host Requests</h3>
                    <div className="space-y-2">
                      {event.coHostRequests.filter(req => req.status === 'pending').map((request, idx) => (
                        <div key={idx} className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30 flex justify-between items-center">
                          <div>
                            <p className="text-white">{request.userId?.name || request.userId?.email || 'User'}</p>
                            <p className="text-purple-300 text-sm">Status: {request.status}</p>
                          </div>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => onApproveCoHost && onApproveCoHost(event._id, request.userId)}
                                className="px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-sm"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => onRejectCoHost && onRejectCoHost(event._id, request.userId)}
                                className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-sm"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requirements' && (
              <div className="space-y-3">
                {event.requirements && event.requirements.length > 0 ? (
                  <ul className="space-y-2">
                    {event.requirements.map((req, idx) => (
                      <li key={idx} className="bg-purple-900/20 p-3 rounded-lg border border-purple-500/30 text-white">
                        • {req}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-purple-400">No specific requirements.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
