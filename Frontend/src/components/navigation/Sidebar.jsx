import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getInstitutionById } from '../../api';
import SidebarSection from './SidebarSection';
import SidebarLink from './SidebarLink';
import { getNavigationSections } from './navigationConfig';

const Sidebar = ({ user: injectedUser }) => {
  const { user: contextUser, logout } = useAuth();
  const user = injectedUser || contextUser;
  const [institutionName, setInstitutionName] = useState('');
  const [institutionVerified, setInstitutionVerified] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user?.institutionId) {
          const instId = typeof user.institutionId === 'object' && user.institutionId._id
            ? user.institutionId._id
            : String(user.institutionId);
          const inst = await getInstitutionById(instId);
          if (mounted && inst) {
            setInstitutionName(inst.name || '');
            setInstitutionVerified(inst.isVerified || false);
          }
        }
      } catch {
        // Ignore institution fetch failures
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.institutionId]);

  const profileUrl = useMemo(() => {
    const rawUrl = user?.profilePhoto || user?.avatar;
    if (!rawUrl) return '/default-avatar.png';
    if (typeof rawUrl === 'string' && rawUrl.includes('default-profile-photo')) {
      return '/default-avatar.png';
    }
    if (/^https?:\/\//.test(rawUrl)) return rawUrl;
    return `${import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space'}/${String(rawUrl).replace(/^\/+/, '')}`;
  }, [user?.profilePhoto, user?.avatar]);

  const collegeText = (institutionName && institutionVerified) ? institutionName : 'Under Approval';

  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
      ? [user.role]
      : [];

  const isVerifier = roles.includes('verifier');
  const isHost = roles.includes('host');
  const isPlatformAdmin = roles.includes('platformAdmin');

  const sections = useMemo(() => getNavigationSections(user), [user]);

  return (
    <div className="h-screen w-64 flex flex-col bg-[#0b0f2b] border-r border-gray-800 text-white overflow-hidden">
      {/* Top Logo */}
      <div className="px-4 py-4.5 border-b border-gray-700 flex items-center">
        <img src="/logo.png" alt="CampVerse Logo" className="h-7 w-7 mr-2" />
        <div className="text-xl font-['Pacifico'] text-white">CampVerse</div>
      </div>

      {/* Scrollable Section */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {/* User Profile */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full object-cover">
                <img
                  src={profileUrl}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/default-avatar.png'; }}
                />
              </div>
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
          {/* Role Badges */}
          <div className="mt-3 flex flex-wrap gap-1">
            {isPlatformAdmin && (
              <span className="badge bg-red-500/30 text-red-300 text-xs px-2 py-0.5 rounded border border-red-500/50">
                <i className="ri-admin-line mr-1"></i>Admin
              </span>
            )}
            {isVerifier && (
              <span className="badge bg-blue-500/30 text-blue-300 text-xs px-2 py-0.5 rounded border border-blue-500/50">
                <i className="ri-shield-check-line mr-1"></i>Verifier
              </span>
            )}
            {isHost && (
              <span className="badge bg-green-500/30 text-green-300 text-xs px-2 py-0.5 rounded border border-green-500/50">
                <i className="ri-mic-line mr-1"></i>Host
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(user?.interests || []).slice(0, 4).map((tag, idx) => (
              <span key={idx} className="badge bg-[#9b5de5]/20 text-[#d9c4ff] text-xs px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="py-2">
          {sections.map((section) => (
            <div key={section.title}>
              <SidebarSection title={section.title} />
              {section.items.map((item) => (
                <SidebarLink
                  key={item.label}
                  icon={item.icon}
                  to={item.to}
                  label={item.label}
                  badge={item.badge}
                  badgeColor={item.badgeColor}
                  end={item.end}
                  onClick={item.onClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Fixed Section */}
      <div className="p-4 border-t border-gray-700">
        <SidebarLink icon="ri-settings-3-line" to="/settings" label="Settings" />
        <SidebarLink icon="ri-question-line" to="/help" label="Help Center" />

        {/* Logout */}
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

export default Sidebar;
