import React, { useState } from "react";
import hackathonImg from "../assets/img/de_1.jpeg";
import workshopImg from "../assets/img/de_2.jpeg";
import seminarImg from "../assets/img/de_3.jpeg";
import { Share2, X } from "lucide-react";

const DiscoverEvents = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userRsvps, setUserRsvps] = useState(new Set());
  const [successMsg, setSuccessMsg] = useState("");

  const events = [
    {
      id: 1,
      title: "Annual Tech Symposium 2025",
      date: "September 15, 2025",
      time: "02:30 PM",
      location: "CUJ Campus",
      host: "CUJ Tech Club",
      participants: 312,
      tags: ["Technology", "Innovation", "Networking"],
      description:
        "A comprehensive technology symposium featuring the latest innovations in AI, robotics, and software development.",
      sessions: [
        { title: "Opening Keynote", time: "02:30 PM", speaker: "Dr. A. Kumar" },
        { title: "AI & Robotics Panel", time: "03:30 PM", speaker: "Prof. S. Mehta" },
        { title: "Networking & Closing", time: "05:00 PM", speaker: "CUJ Team" },
      ],
      image: hackathonImg,
    },
    {
      id: 2,
      title: "Hands-On Workshop",
      date: "October 01, 2025",
      time: "10:00 AM",
      location: "Online",
      host: "SkillUp Labs",
      participants: 120,
      tags: ["Skills", "Training"],
      description:
        "An online hands-on workshop designed to build real-world technical and soft skills. Get guidance from industry experts.",
      sessions: [
        { title: "Introduction & Setup", time: "10:00 AM", speaker: "Mr. R. Singh" },
        { title: "Coding Challenge", time: "11:00 AM", speaker: "Ms. P. Sharma" },
        { title: "Q&A & Wrap Up", time: "01:00 PM", speaker: "Team SkillUp" },
      ],
      image: workshopImg,
    },
    {
      id: 3,
      title: "Professional Seminar",
      date: "October 10, 2025",
      time: "09:00 AM",
      location: "Ranchi Auditorium",
      host: "CUJ Events",
      participants: 200,
      tags: ["Networking", "Talk"],
      description:
        "A one-day seminar bringing together professionals, researchers, and students for discussions, talks, and networking opportunities.",
      sessions: [
        { title: "Welcome & Introduction", time: "09:00 AM", speaker: "CUJ Team" },
        { title: "Industry Insights", time: "10:00 AM", speaker: "Prof. K. Roy" },
        { title: "Panel Discussion", time: "11:30 AM", speaker: "Guest Panelists" },
      ],
      image: seminarImg,
    },
  ];

  const handleRSVP = (event) => {
    if (!userRsvps.has(event.id)) {
      const newRsvps = new Set(userRsvps);
      newRsvps.add(event.id);
      setUserRsvps(newRsvps);
      setSuccessMsg("You have successfully RSVPed!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const eventDate = new Date(`${event.date} ${event.time}`);
    return now < eventDate ? "upcoming" : "past";
  };

  return (
    <div className="bg-transparent rounded-lg p-4 sm:p-6">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-white">Discover Events</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-gray-900 rounded-lg overflow-hidden shadow hover:shadow-xl transition duration-300 border border-gray-800 hover:border-[#9b5de5]/30"
          >
            <img
              src={event.image}
              alt={event.title}
              className="w-full h-48 sm:h-52 md:h-56 object-cover"
            />
            <div className="p-4 flex flex-col justify-between">
              <h3 className="text-lg sm:text-base font-bold text-white truncate">{event.title}</h3>
              <p className="text-gray-400 text-sm mt-1 truncate">
                {event.date} • {event.location}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {event.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs sm:text-[10px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <button
                onClick={() => setSelectedEvent(event)}
                className="mt-4 bg-[#9b5de5] hover:bg-[#8c4be1] px-4 py-2 rounded-lg w-full transition-colors text-white text-sm sm:text-xs"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Event Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setSelectedEvent(null)}
        >
          <div className="bg-gray-900/95 rounded-lg max-w-4xl w-full sm:w-[90%] md:w-[80%] overflow-y-auto shadow-xl p-4 sm:p-6 relative">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-2 sm:mb-4">
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-white p-1 rounded-full hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                className="text-white p-1 rounded-full hover:bg-gray-700"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">
              {selectedEvent.title}
            </h2>
            <span
              className={`mt-1 inline-block px-2 py-1 text-xs sm:text-sm font-medium rounded-full ${
                getEventStatus(selectedEvent) === "upcoming"
                  ? "bg-green-900 text-green-300"
                  : "bg-gray-600 text-gray-300"
              }`}
            >
              {getEventStatus(selectedEvent) === "upcoming" ? "Upcoming" : "Past"}
            </span>

            <div className="mt-3 sm:mt-4 space-y-3 text-gray-300 text-sm sm:text-base">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    <span>{selectedEvent.date} at {selectedEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <span>{selectedEvent.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <span>{selectedEvent.host}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span>{selectedEvent.participants} participants</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-white">About</h3>
                  <p className="text-sm sm:text-base">{selectedEvent.description}</p>

                  <h3 className="font-semibold text-white mt-2">Sessions</h3>
                  <ul className="list-disc list-inside text-sm sm:text-base space-y-1">
                    {selectedEvent.sessions.map((s, i) => (
                      <li key={i}>
                        <span className="font-medium">{s.title}</span> - {s.time} | {s.speaker}
                      </li>
                    ))}
                  </ul>

                  <h3 className="font-semibold text-white mt-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-[#9b5de5]/20 text-[#d9c4ff] px-2 py-1 rounded-full text-xs sm:text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {successMsg && (
                <div className="text-green-400 font-medium text-center text-sm sm:text-base">
                  {successMsg}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={() => handleRSVP(selectedEvent)}
                  className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors text-sm sm:text-base ${
                    userRsvps.has(selectedEvent.id)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                  disabled={userRsvps.has(selectedEvent.id)}
                >
                  {userRsvps.has(selectedEvent.id) ? "RSVPed" : "RSVP"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverEvents;
