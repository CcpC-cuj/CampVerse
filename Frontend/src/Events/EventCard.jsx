import React from "react";
import ShareButton from "../userdashboard/ShareButton";

const EventCard = ({ event, role, onViewDetails, onEdit, onDelete, onShare }) => {
  // Defensive: ensure tags is always array
  const safeTags = Array.isArray(event.tags)
    ? event.tags
    : typeof event.tags === 'string'
      ? event.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

  // Get verification status styling
  const getVerificationBadge = () => {
    if (!event.verificationStatus) return null;
    const statusConfig = {
      approved: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30', label: '✓ Verified' },
      pending: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', label: '⏳ Pending' },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', label: '✗ Rejected' }
    };
    const config = statusConfig[event.verificationStatus] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 ${config.bg} ${config.text} border ${config.border} rounded-full text-xs font-medium`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-[#181a2f] rounded-2xl shadow-lg border border-purple-700/40 p-6 flex flex-col gap-3 hover:border-purple-500/60 transition-colors">
      <div className="flex gap-4 items-center">
        {event.bannerURL && (
          <img src={event.bannerURL} alt="Banner" className="w-24 h-24 object-cover rounded-xl border border-purple-500/30" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-xl font-bold text-white truncate">{event.title}</h3>
            {getVerificationBadge()}
          </div>
          <p className="text-purple-300 text-sm mb-1 line-clamp-2">{event.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {safeTags.slice(0, 3).map(tag => (
              <span key={tag} className="px-2 py-1 bg-purple-700/30 text-purple-300 rounded-full text-xs">{tag}</span>
            ))}
            {safeTags.length > 3 && (
              <span className="px-2 py-1 text-purple-400 text-xs">+{safeTags.length - 3} more</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4 flex-wrap">
        {role === 'user' && (
          <>
            <button onClick={() => onViewDetails && onViewDetails(event)} className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors">View Details</button>
            <ShareButton event={event} />
          </>
        )}
        {(role === 'host' || role === 'verifier') && (
          <>
            <button onClick={() => onEdit && onEdit(event)} className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors">Edit</button>
            <button onClick={() => onDelete && onDelete(event)} className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 transition-colors">Delete</button>
            <ShareButton event={event} />
          </>
        )}
      </div>
    </div>
  );
};

export default EventCard;
