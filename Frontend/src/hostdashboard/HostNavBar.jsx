import React from "react";
import NotificationBell from "../userdashboard/notificationbell";
import CalendarDropdown from "../userdashboard/CalendarDropdown";
import SearchBar from "../userdashboard/SearchBar";

const HostNavBar = ({ onOpenSidebar }) => {
  return (
    <div className="sticky top-0 z-30 bg-transparent">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-xl px-4 sm:px-6 py-3">
          {/* Hamburger */}
          <button
            className="sm:hidden p-2 rounded-lg bg-gray-800/70 text-white hover:scale-105"
            onClick={onOpenSidebar}
          >
            <i className="ri-menu-line text-lg"></i>
          </button>

          {/* Search */}
          <SearchBar placeholder="Search your events, teams, or participants…" />

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell notifications={[]} />
            <CalendarDropdown events={[]} />
            <button
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button flex items-center gap-2 hover:scale-105"
              onClick={() => (window.location.href = "/host/events")}
            >
              <i className="ri-add-line" />
              <span className="hidden sm:inline">New Event</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostNavBar;
