import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <div className="h-full overflow-y-auto flex flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex items-center">
        <div className="text-xl font-['Pacifico'] text-white">CampVerse</div>
      </div>

      {/* User Profile Summary */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={user.avatar || "/default-avatar.png"}
              alt="Profile"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-gray-800"></div>
          </div>
          <div>
            <div className="font-medium flex items-center text-white">
              {user.name}
              <span className="ml-1 text-blue-400 w-4 h-4 flex items-center justify-center">
                <i className="ri-verified-badge-fill ri-sm"></i>
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {user.college || "Your College"} • {user.branch || "Your Branch"}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {(user.tags || ["Tech", "Design", "Debate"]).map((tag, idx) => (
            <span
              key={idx}
              className="badge bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {/* MAIN */}
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Main
        </div>

        <SidebarLink icon="ri-dashboard-line" to="/dashboard" label="Dashboard" />
        <SidebarLink icon="ri-compass-line" to="/explore" label="Discover Events" />
        <SidebarLink icon="ri-calendar-line" to="/my-events" label="My Events" badge="5" />
        <SidebarLink
          icon="ri-notification-3-line"
          to="/notifications"
          label="Notifications"
          badge="3"
          badgeColor="bg-red-500"
        />

        {/* EVENTS */}
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4">
          Events
        </div>

        <SidebarLink icon="ri-calendar-check-line" to="/events/registered" label="Registered" />
        <SidebarLink icon="ri-time-line" to="/events/waitlisted" label="Waitlisted" />
        <SidebarLink icon="ri-bookmark-line" to="/events/saved" label="Saved" />
        <SidebarLink icon="ri-history-line" to="/events/past" label="Past Events" />

        {/* COMMUNITY */}
        <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-4">
          Community
        </div>

        <SidebarLink icon="ri-building-2-line" to="/colleges" label="My Colleges" />
        <SidebarLink icon="ri-medal-line" to="/achievements" label="Achievements" />
        <SidebarLink icon="ri-feedback-line" to="/feedback" label="Feedback" />
      </div>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-700">
        <SidebarLink icon="ri-settings-3-line" to="/settings" label="Settings" />
        <SidebarLink icon="ri-question-line" to="/help" label="Help Center" />
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-400">Dark Mode</span>
          <label className="custom-switch">
            <input type="checkbox" checked readOnly />
            <span className="slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};

const SidebarLink = ({ icon, to, label, badge, badgeColor = "bg-primary" }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:bg-gray-700"}`
      }
    >
      <div className="w-5 h-5 flex items-center justify-center">
        <i className={icon}></i>
      </div>
      <span>{label}</span>
      {badge && (
        <span
          className={`ml-auto ${badgeColor} text-white text-xs px-2 py-0.5 rounded-full`}
        >
          {badge}
        </span>
      )}
    </NavLink>
  );
};

export default Sidebar;
