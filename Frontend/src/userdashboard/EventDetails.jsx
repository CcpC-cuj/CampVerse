import React, { useState } from "react";

const EventDetails = ({ event, onBack, onRSVP }) => {
  const [isRSVPed, setIsRSVPed] = useState(false);

  const handleRSVP = () => {
    onRSVP(event); // call context function
    setIsRSVPed(true);
  };

  return (
    <div className="bg-gray-900 min-h-screen p-6 flex flex-col items-center text-white">
      <button
        onClick={onBack}
        className="self-start mb-4 text-[#9b5de5] hover:text-[#8c4be1] transition"
      >
        ← Back to Events
      </button>

      <div className="w-full max-w-3xl bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-64 object-cover"
        />

        <div className="p-6">
          <h2 className="text-2xl font-bold">{event.title}</h2>
          <p className="text-gray-400 mt-1">
            📅 {event.date} | 📍 {event.location}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {event.tags.map((tag, idx) => (
              <span
                key={idx}
                className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>

          <p className="mt-4 text-gray-300 leading-relaxed">
            {event.description}
          </p>

          {!isRSVPed ? (
            <button
              onClick={handleRSVP}
              className="mt-6 bg-[#9b5de5] hover:bg-[#8c4be1] px-6 py-2 rounded-lg w-full transition-colors"
            >
              RSVP Now
            </button>
          ) : (
            <div className="mt-6 text-center text-green-400 font-semibold">
              ✅ You have RSVP’d for this event!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;