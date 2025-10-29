import React, { useState, useRef, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarDropdown = ({ events = [] }) => {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get events for a specific date
  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((e) => {
      if (!e.date) return false;
      const eventDate = new Date(e.date).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month" && events.length > 0) {
      const dateStr = date.toISOString().split("T")[0];
      const hasEvent = events.some((e) => {
        if (!e.date) return false;
        const eventDate = new Date(e.date).toISOString().split("T")[0];
        return eventDate === dateStr;
      });
      if (hasEvent) {
        return "bg-[#9b5de5] text-purple-200 rounded-full";
      }
    }
    return "";
  };

  const handleDateClick = (date) => {
    const eventsOnDate = getEventsForDate(date);
    if (eventsOnDate.length > 0) {
      setSelectedDate(date);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="bg-gray-800/60 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80"
      >
        <i className="ri-calendar-line" />
      </button>

      {open && (
        <div
          className="
            fixed top-20 left-1/2 -translate-x-1/2 
            sm:absolute sm:top-auto sm:right-0 sm:left-auto sm:translate-x-0 sm:mt-2
            z-50 bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-lg
          "
        >
          <Calendar
            tileClassName={tileClassName}
            className="!bg-transparent text-purple-300"
            nextLabel="›"
            prevLabel="‹"
            onClickDay={handleDateClick}
            navigationLabel={({ date }) =>
              date.toLocaleDateString("default", {
                month: "long",
                year: "numeric",
              })
            }
          />

          {selectedDate && getEventsForDate(selectedDate).length > 0 && (
            <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-700">
              <h4 className="text-purple-300 font-semibold mb-2">
                Events on {selectedDate.toLocaleDateString()}:
              </h4>
              <ul className="space-y-2">
                {getEventsForDate(selectedDate).map((event, idx) => (
                  <li key={idx} className="text-sm">
                    <div className="text-white font-medium">{event.title}</div>
                    <div className="text-purple-300 text-xs">
                      📍 {event.location?.venue || event.location?.type || "TBD"}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {events.length === 0 && (
            <p className="text-purple-500 text-sm text-center mt-2">
              No registered events
            </p>
          )}
        </div>
      )}

      {/* Calendar Styling */}
      <style>
        {`
          .react-calendar {
            color: #d7b2ff;
          }
          .react-calendar__navigation button {
            color: #c59aff;
          }
          .react-calendar__navigation button:hover {
            background-color: rgba(155, 93, 229, 0.2);
          }
          .react-calendar__month-view__days__day {
            color: #c9a2ff;
          }
          .react-calendar__month-view__days__day:hover {
            background-color: rgba(155, 93, 229, 0.15);
            border-radius: 9999px;
          }
          .react-calendar__tile--active {
            background-color: #9b5de5 !important;
            color: #e6d2ff !important;
            border-radius: 9999px;
          }
          /* Today (remove default yellow) ====================== */
          .react-calendar__tile--now {
            background-color: rgba(155, 93, 229, 0.25) !important;
            color: #e6d2ff !important;
            border-radius: 9999px;
          }
        `}
      </style>
    </div>
  );
};

export default CalendarDropdown;
