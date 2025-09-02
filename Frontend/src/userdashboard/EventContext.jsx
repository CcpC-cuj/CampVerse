// userdashboard/EventContext.jsx
import React, { createContext, useContext, useState } from "react";

const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const rsvpEvent = (event) => {
    // Prevent duplicate RSVP
    if (!registeredEvents.find((e) => e.id === event.id)) {
      setRegisteredEvents([...registeredEvents, event]);

      // Add notification
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          message: `You successfully RSVPed for "${event.name}" 🎉`, // ← backticks
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <EventContext.Provider value={{ registeredEvents, notifications, rsvpEvent }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEventContext = () => useContext(EventContext);
