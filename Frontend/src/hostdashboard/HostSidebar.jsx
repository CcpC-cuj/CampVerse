import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const HostSidebar = () => {
  const { user, logout } = useAuth();
  const profileUrl = user?.profilePhoto || user?.avatar || "/default-avatar.png";

  return (
    <div className="h-screen w-64 flex flex-col bg-[#0b0f2b] border-r border-gray-800 text-white font-poppins overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 flex items-center">
        <div className="text-xl font-['Pacifico']">CampVerse</div>
        <span className="ml-1 text-[#9b5de5]"><i className="ri-rocket-2-fill" /></span>
      </div>

      {/* Scrollable */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {/* Host info */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <img
              src={profileUrl}
              alt="Host"
              className="w-12 h-12 rounded-full object-cover"
              onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='/default-avatar.png'; }}
            />
            <div>
              <div className="font-medium flex items-center">
                {user?.name || "Host"}
                <span className="ml-1 text-[#9b5de5]">
                  <i className="ri-verified-badge-fill ri-sm" />
                </span>
              </div>
              <div className="text-xs text-gray-400">Organizer</div>
            </div>
          </div>
        </div>

        {/* Links */}
        <Section title="Main" />
        <Item to="/host/dashboard" icon="ri-dashboard-line" label="Dashboard" end />
        <Item to="/host/events" icon="ri-calendar-event-line" label="My Events" />
        <Item to="/host/applications" icon="ri-file-user-line" label="Applications" badge="12" />
        <Item to="/host/analytics" icon="ri-line-chart-line" label="Analytics" />
        <Section title="Account" />
        <Item to="/host/settings" icon="ri-settings-3-line" label="Settings" />
        <Item to="/help" icon="ri-question-line" label="Help Center" />
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="group w-full flex items-center justify-center gap-2 px-4 py-2 rounded-button border border-[#9b5de5]/40 text-[#e9ddff] bg-transparent hover:bg-[#9b5de5]/20 hover:border-[#9b5de5]/60 transition-all"
        >
          <i className="ri-logout-box-r-line group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

const Section = ({ title }) => (
  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</div>
);

const Item = ({ to, icon, label, badge, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        isActive ? "bg-[#9b5de5] text-white" : "text-gray-300 hover:bg-[#9b5de5]/20 hover:text-white"
      }`
    }
  >
    <div className="w-5 h-5 flex items-center justify-center">
      <i className={icon}></i>
    </div>
    <span>{label}</span>
    {badge && (
      <span className="ml-auto bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </NavLink>
);

export default HostSidebar;
