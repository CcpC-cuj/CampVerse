import React, { useState } from "react";
import hackathonImg from "../assets/img/de_1.jpeg";
import workshopImg from "../assets/img/de_2.jpeg";
import seminarImg from "../assets/img/de_3.jpeg";
import EventDetails from "./EventDetails";
import { useEventContext } from "./EventContext";

const DiscoverEvents = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { rsvpEvent } = useEventContext();
  

  const events = [
    {
      id: 1,
      title: "Hackathon",
      date: "15 Aug 2025",
      location: "CUJ Campus",
      image: hackathonImg,
      tags: ["AI", "Hackathon", "Coding"],
      description:
        "Join our 24-hour hackathon at CUJ! Collaborate with peers, build innovative solutions in AI and coding, and compete for prizes.",
    },
    {
      id: 2,
      title: "Workshop",
      date: "01 Sep 2025",
      location: "Online",
      image: workshopImg,
      tags: ["Skills", "Training"],
      description:
        "An online hands-on workshop designed to build real-world technical and soft skills. Get guidance from industry experts.",
    },
    {
      id: 3,
      title: "Seminar",
      date: "10 Sep 2025",
      location: "Ranchi",
      image: seminarImg,
      tags: ["Networking", "Talk"],
      description:
        "A one-day seminar bringing together professionals, researchers, and students for discussions, talks, and networking opportunities.",
    },
  ];

  if (selectedEvent) {
    return (
      <EventDetails
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onRSVP={rsvpEvent}
      />
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-white">Discover Events</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition duration-300 border border-gray-800 hover:border-[#9b5de5]/30"
          >
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-lg font-bold text-white">{event.title}</h3>
              <p className="text-gray-400 text-sm mt-1">
                {event.date} • {event.location}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {event.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setSelectedEvent(event)}
                className="mt-4 bg-[#9b5de5] hover:bg-[#8c4be1] px-4 py-2 rounded-button w-full transition-colors text-white"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DiscoverEvents;