export const getNavigationSections = (user) => {
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
      ? [user.role]
      : [];

  const isHost = roles.includes('host');
  const isVerifier = roles.includes('verifier');
  const isPlatformAdmin = roles.includes('platformAdmin');

  const sections = [
    {
      title: 'Main',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: 'ri-dashboard-line', end: true },
        { label: 'Discover Events', to: '/dashboard/discover-events', icon: 'ri-compass-line', end: true },
      ],
    },
    {
      title: 'Events',
      items: [
        { label: 'My Events', to: '/dashboard/events', icon: 'ri-calendar-event-line' },
        { label: 'My Certificates', to: '/dashboard/certificates', icon: 'ri-award-line' },
        { label: 'My Badges', to: '/dashboard/badges', icon: 'ri-medal-2-line' },
      ],
    },
    {
      title: 'Community',
      items: [
        { label: 'My Institution', to: '/colleges', icon: 'ri-building-2-line' },
        { label: 'Feedback', to: '/feedback', icon: 'ri-feedback-line' },
      ],
    },
  ];

  if (isHost) {
    sections.push({
      title: 'Host Panel',
      items: [
        { label: 'Manage Events', to: '/host/manage-events', icon: 'ri-calendar-2-line' },
        { label: 'Analytics', to: '/host/analytics', icon: 'ri-line-chart-line' },
      ],
    });
  }

  if (isVerifier) {
    sections.push({
      title: 'Verifier Panel',
      items: [
        { label: 'Verifier Dashboard', to: '/verifier/dashboard', icon: 'ri-shield-user-line' },
        { label: 'Event Queue', to: '/verifier/event-queue', icon: 'ri-list-check-2' },
        { label: 'Certificate Review', to: '/verifier/certificate-review', icon: 'ri-file-certificate-line' },
        { label: 'Verifier Analytics', to: '/verifier/analytics', icon: 'ri-bar-chart-box-line' },
      ],
    });
  }

  if (isPlatformAdmin) {
    sections.push({
      title: 'Admin Panel',
      items: [
        { label: 'Admin Dashboard', to: '/admin/dashboard', icon: 'ri-admin-line' },
        { label: 'User Management', to: '/admin/users', icon: 'ri-user-settings-line' },
        { label: 'Institutions', to: '/admin/institutions', icon: 'ri-building-4-line' },
        { label: 'Platform Analytics', to: '/admin/analytics', icon: 'ri-line-chart-line' },
        { label: 'Certificate Templates', to: '/admin/certificate-templates', icon: 'ri-file-upload-line' },
        { label: 'Support Tickets', to: '/admin/support', icon: 'ri-customer-service-2-line' },
        { label: 'Feedback', to: '/admin/feedback', icon: 'ri-feedback-line' },
        { label: 'Admin Tools', to: '/admin/tools', icon: 'ri-tools-line' },
        { label: 'System Settings', to: '/admin/settings', icon: 'ri-tools-line' },
      ],
    });
  }

  return sections;
};
