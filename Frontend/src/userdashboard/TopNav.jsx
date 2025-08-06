import React from "react";
import { useAuth } from "../contexts/AuthContext";

const TopNav = () => {
  const { user } = useAuth();

  return (
    <div className="flex justify-between items-center p-4 bg-white shadow-md">
      <div className="text-xl font-semibold">
        Welcome{user ? `, ${user.name}` : " to CampVerse"}
      </div>
      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-gray-800">
          <i className="ri-notification-3-line text-xl" />
        </button>
        <img
          src={user?.profilePicture || "/default-profile.png"}
          alt="Profile"
          className="w-10 h-10 rounded-full"
        />
      </div>
    </div>
  );
};

export default TopNav;
