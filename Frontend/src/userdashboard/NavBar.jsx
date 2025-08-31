import React from "react";
import NotificationBell from "./NotificationBell.jsx";
import CalendarDropdown from "./CalendarDropdown";
import SearchBar from "./SearchBar"; // reusable component

const NavBar = ({ onOpenSidebar, eventsData, searchQuery, setSearchQuery }) => {
  return (
    <div className="sticky top-0 z-30 bg-transparent">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-xl px-4 sm:px-6 py-3">

          {/* Hamburger Button (mobile only) */}
          <button
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800/70 text-white hover:bg-gray-700"
            onClick={onOpenSidebar}
          >
            <i className="ri-menu-line text-lg"></i>
          </button>

          {/* Search Bar */}
          <div className="flex-1 order-2 sm:order-1 w-full sm:w-auto">
            <SearchBar
              placeholder="Search events, colleges, or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right Nav Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2">
            <NotificationBell notifications={[]} />
            <CalendarDropdown events={eventsData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavBar;
