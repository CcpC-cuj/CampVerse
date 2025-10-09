import React from "react";
import { useAuth } from "../contexts/AuthContext";

const TopNav = () => {
  const { user } = useAuth();

  return (
    <div className="flex justify-between items-center p-4 bg-gray-800/60 backdrop-blur-md border-b border-gray-700 text-white">
      <div className="text-xl font-semibold">
        Welcome{user ? `, ${user.name}` : " to CampVerse"}
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-300 hover:text-white bg-gray-800/60 hover:bg-gray-800/80 p-2 rounded-lg transition-all">
          <i className="ri-notification-3-line text-xl" />
        </button>
        <img
          src={user?.profilePhoto || user?.googleProfileImage || user?.avatar || "/default-avatar.png"}
          alt="Profile"
          className="w-10 h-10 rounded-full border border-[#9b5de5]/30"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.png'; }}
        />
      </div>
    </div>
  );
};

export default TopNav;
