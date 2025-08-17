import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { NavLink } from "react-router-dom";
import { getInstitutionById } from "../api";

const Sidebar = ({ onDiscoverClick }) => {
  const { user, logout } = useAuth();
  const [institutionName, setInstitutionName] = useState('');
  const [institutionVerified, setInstitutionVerified] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user?.institutionId) {
          const inst = await getInstitutionById(user.institutionId);
          if (mounted && inst) {
            setInstitutionName(inst.name || '');
            setInstitutionVerified(inst.isVerified || false);
          }
        }
      } catch {}
      return () => { mounted = false; };
    })();
  }, [user?.institutionId]);

  const profileUrl = user?.profilePhoto || user?.avatar || "/default-avatar.png";
  const collegeText = (institutionName && institutionVerified) ? institutionName : "Under Approval";

  return (
    <div className="h-screen w-64 flex flex-col bg-[#0b0f2b] border-r border-gray-800 text-white font-poppins overflow-hidden">
      {/* Top Logo */}
      <div className="p-4 border-b border-gray-700 flex items-center">
        <div className="text-xl font-['Pacifico'] text-white">CampVerse</div>
      </div>

      {/* Scrollable Section */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {/* User Profile */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={profileUrl}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover"
                onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src='/default-avatar.png'; }}
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-gray-800"></div>
            </div>
            <div>
              <div className="font-medium flex items-center">
                {user?.name || 'User'}
                <span className="ml-1 text-[#9b5de5] w-4 h-4 flex items-center justify-center">
                  <i className="ri-verified-badge-fill ri-sm"></i>
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {collegeText}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {(user?.interests || ["Tech", "Design", "Debate"]).slice(0,6).map((tag, idx) => (
              <span
                key={idx}
                className="badge bg-[#9b5de5]/20 text-[#d9c4ff] text-xs px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="py-2">
          <SidebarSection title="Main" />
          <SidebarLink icon="ri-dashboard-line" to="/dashboard" label="Dashboard" end />

          {/* ✅ Changed: use onClick instead of route to scroll inside UserDashboard */}
          <SidebarLink
            icon="ri-compass-line"
            to="/dashboard/discover-events" 
            label="Discover Events"
            end
          />
          <SidebarLink icon="ri-calendar-event-line" to="/dashboard/events" label="My Events" />




          <SidebarSection title="Events" />
          <SidebarLink icon="ri-calendar-check-line" to="/events/registered" label="Registered" />
          <SidebarLink icon="ri-time-line" to="/events/waitlisted" label="Waitlisted" />
          <SidebarLink icon="ri-bookmark-line" to="/events/saved" label="Saved" />
          <SidebarLink icon="ri-history-line" to="/events/past" label="Past Events" />

          <SidebarSection title="Community" />
          <SidebarLink icon="ri-building-2-line" to="/colleges" label="My Colleges" />
          <SidebarLink icon="ri-medal-line" to="/achievements" label="Achievements" />
          <SidebarLink icon="ri-feedback-line" to="/feedback" label="Feedback" />
        </div>
      </div>

      {/* Bottom Fixed Section */}
      <div className="p-4 border-t border-gray-700">
        <SidebarLink icon="ri-settings-3-line" to="/settings" label="Settings" />
        <SidebarLink icon="ri-question-line" to="/help" label="Help Center" />

        {/* Logout (purple theme) */}
        <button
          onClick={logout}
          aria-label="Logout"
          className="group mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-button border border-[#9b5de5]/40 text-[#e9ddff] bg-transparent hover:bg-[#9b5de5]/20 hover:border-[#9b5de5]/60 transition-all duration-200 hover:shadow-[0_0_15px_rgba(155,93,229,0.35)] active:scale-[0.98] backdrop-blur-sm"
        >
          <i className="ri-logout-box-r-line transition-transform duration-200 group-hover:-translate-x-0.5"></i>
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

const SidebarSection = ({ title }) => (
  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
    {title}
  </div>
);

/**
 * SidebarLink now supports BOTH:
 * - route links via `to`
 * - action buttons via `onClick` (used for Discover Events)
 * Everything else is unchanged.
 */
const SidebarLink = ({ icon, to, label, badge, badgeColor = "bg-[#9b5de5]", end = false, onClick }) => {
  // Button for actions (no route)
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all text-gray-300 hover:bg-[#9b5de5]/20 hover:text-white"
      >
        <div className="w-5 h-5 flex items-center justify-center">
          <i className={icon}></i>
        </div>
        <span>{label}</span>
        {badge && (
          <span className={`ml-auto ${badgeColor} text-white text-xs px-2 py-0.5 rounded-full`}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  // Default: NavLink for routes
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
          isActive
            ? "bg-[#9b5de5] text-white"
            : "text-gray-300 hover:bg-[#9b5de5]/20 hover:text-white"
        }`
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
