import React, { useState, useRef, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarDropdown = ({ events }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Function to highlight event dates
  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateStr = date.toISOString().split("T")[0];
      const event = events.find((e) => e.date === dateStr);
      if (event) {
        return event.type === "upcoming" ? "bg-green-500 rounded-full text-white" : "bg-red-500 rounded-full text-white";
      }
    }
    return null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Calendar Icon Button */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-gray-800/60 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80"
      >
        <i className="ri-calendar-line" />
      </button>

      {/* Calendar Popup */}
      {open && (
        <div className="absolute right-0 mt-2 bg-gray-900 p-3 rounded-xl border border-gray-700 shadow-lg z-50">
          <Calendar
            tileClassName={tileClassName}
            className="bg-transparent text-white"
          />
          {events.length === 0 && (
            <p className="text-gray-400 text-sm text-center mt-2">No events</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarDropdown;
