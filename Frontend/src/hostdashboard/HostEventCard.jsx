import React from "react";

const HostEventCard = ({ event }) => {
  const date = new Date(event.date);
  const d = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const statusColor =
    event.status === "Live"
      ? "bg-green-500/20 text-green-300"
      : event.status === "Draft"
      ? "bg-gray-500/20 text-gray-300"
      : "bg-amber-500/20 text-amber-300";

  return (
    <div className="bg-gray-800/60 rounded-xl overflow-hidden border border-gray-700/40 hover:border-[#9b5de5]/30 transition">
      <img src={event.cover} alt={event.title} className="w-full h-36 object-cover" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">{event.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded ${statusColor}`}>{event.status}</span>
        </div>
        <div className="text-sm text-gray-300">{d}</div>
        <div className="text-sm text-gray-400 mt-1">
          Registrations: <span className="text-white font-medium">{event.registrations}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1 rounded-button bg-gray-800/70 hover:bg-gray-800">
            <i className="ri-edit-line mr-1" /> Edit
          </button>
          <button className="px-3 py-1 rounded-button bg-[#9b5de5]/20 hover:bg-[#9b5de5]/30">
            <i className="ri-external-link-line mr-1" /> View
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostEventCard;
