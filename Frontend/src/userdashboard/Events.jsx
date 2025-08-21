import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import Sidebar from "../userdashboard/sidebar";
import NotificationBell from "../userdashboard/notificationbell";
import SearchBar from "../components/SearchBar";

const Events = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0`}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className=" flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        
        {/* Top Navigation */}
        <div className="sticky top-0 z-30 bg-transparent">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap bg-gray-800/60 backdrop-blur-md border border-gray-700  px-4 sm:px-6 py-3">

              {/* Hamburger Button */}
              <button
                className="sm:hidden p-2 rounded-lg bg-gray-800/70 text-white hover:scale-105"
                onClick={() => setSidebarOpen(true)}
              >
                <i className="ri-menu-line text-lg"></i>
              </button>

              

              {/* Search Bar */}
              <SearchBar />

              {/* Right Nav Buttons */}
              <div className="flex items-center gap-2 sm:gap-4">
                <NotificationBell notifications={[]} />
                <button className="bg-gray-800/60 p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/80">
                  <i className="ri-calendar-line" />
                </button>
                <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button flex items-center gap-2 hover:scale-105">
                  <i className="ri-add-line" />
                  <span className="hidden sm:inline">Host Event</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Events Categories */}
          {["Registered", "Waitlisted", "Saved", "Past Events"].map((category, idx) => (
            <div key={idx} className="bg-gradient-to-r from-[#9b5de5]/20 to-transparent rounded-lg p-6 mb-6 border border-[#9b5de5]/15">
              <h2 className="text-xl font-bold mb-4">{category}</h2>
              <p className="text-gray-400">No {category.toLowerCase()} yet.</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Events;
