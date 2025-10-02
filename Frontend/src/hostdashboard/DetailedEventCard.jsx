import React, { useState, useEffect } from "react";
import { useEventParticipants } from "../hooks/useEventParticipants";

const DetailedEventCard = ({ event, onEdit, onDelete, onViewParticipants }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { participantStats, loading: participantsLoading, error: participantsError, refetch } = useEventParticipants(event._id);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "published":
      case "active":
      case "Live":
        return { color: "bg-green-500/20 text-green-300", label: "Published" };
      case "draft":
      case "Draft":
        return { color: "bg-gray-500/20 text-gray-300", label: "Draft" };
      case "cancelled":
        return { color: "bg-red-500/20 text-red-300", label: "Cancelled" };
      default:
        return { color: "bg-amber-500/20 text-amber-300", label: status || "Unknown" };
    }
  };

  const getEventStatus = () => {
    // If event is not verified, always show 'draft'
    if (event.verified === false || event.verified === 'false' || event.status === 'draft' || event.status === 'Draft') {
      return 'draft';
    }
    const now = new Date();
    const eventDate = new Date(event.date);

    if (now < eventDate) return 'upcoming';
    if (now > eventDate) return 'past';
    return 'ongoing';
  };

  const statusInfo = getStatusInfo(event.status);
  const eventStatus = getEventStatus();

  // Use real participant count or fallback to event data
  const participantCount = participantStats.total || (Array.isArray(event.participants) ? event.participants.length : event.participants) || event.registrations || 0;
  const maxParticipants = event.maxParticipants || event.capacity;

  return (
    <div className="bg-gray-800/60 rounded-xl overflow-hidden border border-gray-700/40 hover:border-[#9b5de5]/30 transition-all duration-300 group">
      {/* Event Image */}
      <div className="relative">
        <img 
          src={event.bannerURL || event.bannerImage || event.cover || "https://via.placeholder.com/400x200?text=No+Image"} 
          alt={event.title} 
          className="w-full h-36 object-cover"
        />
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color} font-medium`}>
            {statusInfo.label}
          </span>
        </div>

        {/* Event Status Badge */}
        <div className="absolute top-2 right-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            eventStatus === 'draft' ? 'bg-gray-500/20 text-gray-300' :
            eventStatus === 'upcoming' ? 'bg-blue-500/20 text-blue-300' :
            eventStatus === 'ongoing' ? 'bg-green-500/20 text-green-300' :
            'bg-gray-500/20 text-gray-300'
          }`}>
            {eventStatus === 'draft' ? 'Draft' : eventStatus.charAt(0).toUpperCase() + eventStatus.slice(1)}
          </span>
        </div>

        {/* Actions Dropdown */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg border border-gray-700 z-10">
                <button
                  onClick={() => {
                    onEdit(event);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Event
                </button>
                <button
                  onClick={() => {
                    onViewParticipants && onViewParticipants(event);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  View Participants
                </button>
                <button
                  onClick={() => {
                    refetch(); // Refresh participant data
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/events/${event._id}`);
                    // ...existing code...
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </button>
                <hr className="border-gray-700" />
                <button
                  onClick={() => {
                    onDelete(event._id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Event Title */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-white text-lg leading-tight pr-2">{event.title}</h3>
        </div>

        {/* Event Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(event.date)}
          </div>

          {(event.location || event.venue) && (
            <div className="flex items-center gap-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.location?.venue || event.venue || event.location?.type || event.location}
              {event.location?.type && event.location?.venue && ` (${event.location.type})`}
            </div>
          )}

          {(event.category || event.type) && (
            <div className="flex items-center gap-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {event.category || event.type}
            </div>
          )}

          {event.organizer && (
            <div className="flex items-center gap-2 text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {typeof event.organizer === "object"
                ? `${event.organizer.name || ""}${event.organizer.type ? ` (${event.organizer.type})` : ""}`
                : event.organizer}
            </div>
          )}
        </div>

        {/* Participants Info with Real-time Data */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{participantCount}</span>
              {maxParticipants && ` / ${maxParticipants}`} participants
              {participantsLoading && (
                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            {participantStats.total > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {participantStats.registered > 0 && `${participantStats.registered} registered`}
                {participantStats.waitlisted > 0 && `, ${participantStats.waitlisted} waitlisted`}
                {participantStats.attended > 0 && `, ${participantStats.attended} attended`}
              </div>
            )}
          </div>
          
          {(event.fee !== undefined || event.price !== undefined) && (
            <div className="text-sm font-medium">
              {(event.fee === 0 || event.price === 0 || event.isPaid === false) ? (
                <span className="text-green-400">Free</span>
              ) : (
                <span className="text-blue-400">₹{event.fee || event.price}</span>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="mt-3 text-[#d9c4ff] text-xs">
            {Array.isArray(event.tags)
              ? event.tags.join(', ')
              : event.tags}
          </div>
        )}

        {/* Sessions */}
        {event.sessions && event.sessions.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium text-purple-300 mb-1">Sessions/Agenda:</h4>
            <div className="text-gray-400 text-sm" style={{ whiteSpace: 'pre-wrap' }}>
              {Array.isArray(event.sessions) ? event.sessions.join('\n') : event.sessions}
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="mt-3 text-gray-400 text-sm line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(event)}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            
            <button
              onClick={() => {
                // Open event details modal
                if (onViewParticipants) {
                  // Use a separate handler for viewing event details
                  const viewDetailsHandler = window.__viewEventDetails;
                  if (viewDetailsHandler) {
                    viewDetailsHandler(event);
                  }
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-[#9b5de5]/20 hover:bg-[#9b5de5]/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </button>
            
            <button
              onClick={() => onDelete(event._id)}
              className="flex-1 px-3 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
          
          <button
            onClick={() => onViewParticipants && onViewParticipants(event)}
            className="w-full px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 transition-colors text-sm font-medium flex items-center justify-center gap-2 text-blue-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            View Participants ({participantCount})
            {participantsError && (
              <span className="text-red-400 text-xs ml-1">⚠</span>
            )}
          </button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default DetailedEventCard;