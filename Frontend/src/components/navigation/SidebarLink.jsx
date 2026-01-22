import React from 'react';
import { NavLink, useInRouterContext } from 'react-router-dom';

const SidebarLink = ({ icon, to, label, badge, badgeColor = 'bg-[#9b5de5]', end = false, onClick }) => {
  const inRouter = useInRouterContext();

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

  if (!inRouter) {
    return (
      <a
        href={to}
        className="flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all text-gray-300 hover:bg-[#9b5de5]/20 hover:text-white"
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
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
          isActive
            ? 'bg-[#9b5de5] text-white'
            : 'text-gray-300 hover:bg-[#9b5de5]/20 hover:text-white'
        }`
      }
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
    </NavLink>
  );
};

export default SidebarLink;
