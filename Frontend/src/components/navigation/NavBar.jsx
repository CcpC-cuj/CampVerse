import React from 'react';
import NotificationBell from '../../userdashboard/NotificationBell';
import CalendarDropdown from '../../userdashboard/CalendarDropdown';
import SearchBar from '../../userdashboard/SearchBar';

const NavBar = ({
  onOpenSidebar,
  eventsData = [],
  searchQuery,
  setSearchQuery,
  searchPlaceholder = 'Search events, colleges, or categories...'
}) => {
  return (
    <div className="sticky top-0 z-30 bg-transparent">
      <div className="px-4 sm:px-6 py-1">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-xl px-4 sm:px-6 py-2">
          {/* Mobile Hamburger */}
          <button
            className="sm:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800/70 text-white hover:bg-gray-700"
            onClick={onOpenSidebar}
          >
            <i className="ri-menu-line text-lg"></i>
          </button>

          {/* Search Bar */}
          <div className="flex-1 order-2 sm:order-1 w-full sm:w-auto">
            <SearchBar
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            />
          </div>

          {/* Right Side Buttons */}
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
