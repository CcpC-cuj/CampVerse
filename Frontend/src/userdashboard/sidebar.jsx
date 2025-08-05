// src/components/Sidebar.jsx
import React from "react";
import "remixicon/fonts/remixicon.css";

const Sidebar = () => {
  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col justify-between">
      {/* Logo */}
      <div className="p-4 text-xl font-bold">CampVerse</div>

      {/* Navigation */}
      <div className="flex flex-col gap-4 px-4">
        <a href="#" className="sidebar-item">
          <i className="ri-dashboard-line w-5 h-5" />
          <span>Dashboard</span>
        </a>
        <a href="#" className="sidebar-item">
          <i className="ri-medal-line w-5 h-5" />
          <span>Achievements</span>
        </a>
        <a href="#" className="sidebar-item">
          <i className="ri-building-line w-5 h-5" />
          <span>Colleges</span>
        </a>
        <a href="#" className="sidebar-item">
          <i className="ri-notification-2-line w-5 h-5" />
          <span>Notifications</span>
        </a>
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-700">
        <a href="#" className="sidebar-item">
          <i className="ri-settings-3-line w-5 h-5" />
          <span>Settings</span>
        </a>
        <a href="#" className="sidebar-item">
          <i className="ri-question-line w-5 h-5" />
          <span>Help Center</span>
        </a>
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-400">Dark Mode</span>
          <label className="custom-switch">
            <input type="checkbox" defaultChecked />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
