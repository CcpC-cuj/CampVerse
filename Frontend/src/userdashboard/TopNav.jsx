import React from "react";
import { useAuth } from "../contexts/AuthContext";
import NotificationBell from "./notificationbell";
import CalendarDropdown from "./CalendarDropdown";

const TopNav = ({ notifications = [], markedDates = [] }) => {
  const { user } = useAuth();

  return (
    <div className="flex justify-between items-center p-4 bg-gray-800/60 backdrop-blur-md border-b border-gray-700 text-white">
      {/* Left Side (Welcome Text) */}
      <div className="text-xl font-semibold">
        {user ? `Welcome, ${user.name}` : "Welcome to CampVerse"}
      </div>

      {/* Right Side (Calendar, Notifications, Profile) */}
      <div className="flex items-center gap-4">
        <CalendarDropdown markedDates={markedDates} />
        <NotificationBell notifications={notifications} />
        <img
          src={user?.profilePicture || "/default-profile.png"}
          alt="Profile"
          className="w-10 h-10 rounded-full border border-[#9b5de5]/30"
        />
      </div>
    </div>
  );
};

export default TopNav;
