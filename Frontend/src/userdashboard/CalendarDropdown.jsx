import React, { useState, useRef, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

const CalendarDropdown = ({ events = [] }) => {
  const [open, setOpen] = useState(false);
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

  const tileClassName = ({ date, view }) => {
    if (view === "month" && events.length > 0) {
      const dateStr = date.toISOString().split("T")[0];
      const event = events.find((e) => e.date === dateStr);
      if (event) {
        return "bg-[#9b5de5] text-purple-200 rounded-full";
      }
    }
    return "";
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
        <div className="absolute right-0 mt-2 z-50 bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-lg">
          <Calendar
            tileClassName={tileClassName}
            className="!bg-transparent text-purple-300"
            nextLabel="›"
            prevLabel="‹"
            navigationLabel={({ date }) =>
              date.toLocaleDateString("default", { month: "long", year: "numeric" })
            }
          />

          {events.length === 0 && (
            <p className="text-purple-500 text-sm text-center mt-2">No events</p>
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
