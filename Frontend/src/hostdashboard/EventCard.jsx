import React from "react";
import ShareButton from "../userdashboard/ShareButton";

const EventCard = ({ event, role, onViewDetails, onEdit, onDelete, onShare }) => {
  // Defensive: ensure tags is always array
  const safeTags = Array.isArray(event.tags)
    ? event.tags
    : typeof event.tags === 'string'
      ? event.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

  return (
    <div className="bg-[#181a2f] rounded-2xl shadow-lg border border-purple-700/40 p-6 flex flex-col gap-3">
      <div className="flex gap-4 items-center">
        {event.bannerURL && (
          <img src={event.bannerURL} alt="Banner" className="w-24 h-24 object-cover rounded-xl border border-purple-500/30" />
        )}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{event.title}</h3>
          <p className="text-purple-300 text-sm mb-1">{event.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {safeTags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-purple-700/30 text-purple-300 rounded-full text-xs">{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        {role === 'user' && (
          <>
            <button onClick={() => onViewDetails(event)} className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors">View Details</button>
            <ShareButton event={event} />
          </>
        )}
        {(role === 'host' || role === 'verifier') && (
          <>
            <button onClick={() => onEdit(event)} className="px-4 py-2 bg-purple-700 text-white rounded-lg font-medium hover:bg-purple-800 transition-colors">Edit</button>
            <button onClick={() => onDelete(event)} className="px-4 py-2 bg-red-700 text-white rounded-lg font-medium hover:bg-red-800 transition-colors">Delete</button>
            <ShareButton event={event} />
          </>
        )}
      </div>
    </div>
  );
};

export default EventCard;
