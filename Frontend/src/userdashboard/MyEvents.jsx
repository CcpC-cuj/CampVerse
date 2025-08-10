import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const MyEvents = () => {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Replace this with backend API fetch later
    const myEventsData = [
      {
        id: 1,
        title: "AI Hackathon 2025",
        date: "15 Aug 2025",
        location: "Online",
        image: "/images/ai-hackathon.jpg",
        status: "Confirmed"
      },
      {
        id: 2,
        title: "Web Dev Bootcamp",
        date: "22 Aug 2025",
        location: "CUJ Campus",
        image: "/images/web-bootcamp.jpg",
        status: "Pending"
      }
    ];
    setEvents(myEventsData);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {user?.name ? `${user.name}'s Events` : "My Events"}
      </h1>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {event.title}
                </h2>
                <p className="text-sm text-gray-500">{event.date} • {event.location}</p>
                <span
                  className={`inline-block mt-3 px-3 py-1 text-sm rounded-full ${
                    event.status === "Confirmed"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {event.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">You have not registered for any events yet.</p>
      )}
    </div>
  );
};

export default MyEvents;
