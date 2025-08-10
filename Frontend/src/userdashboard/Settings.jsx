import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthenticationSettings from '../components/AuthenticationSettings';
import Sidebar from './sidebar';
import { getMyNotificationPreferences, updateMyNotificationPreferences, deleteMyAccount } from '../api';

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('authentication');
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState({ email: {}, inApp: {} });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await getMyNotificationPreferences();
        const safePrefs = prefs || { email: {}, inApp: {} };
        setNotifPrefs(safePrefs);
        const emailAny = Object.values(safePrefs.email || {}).some(Boolean);
        const inAppAny = Object.values(safePrefs.inApp || {}).some(Boolean);
        setEmailNotifications(emailAny);
        setPushNotifications(inAppAny);
      } catch (e) {
        // ignore
      }
    };
    loadPrefs();
  }, []);

  const saveNotificationPrefs = async () => {
    try {
      setNotifSaving(true);
      const res = await updateMyNotificationPreferences({ email: notifPrefs.email, inApp: notifPrefs.inApp });
      setNotifMessage(res && res.message ? 'Saved' : (res.error || 'Failed'));
    } catch (e) {
      setNotifMessage('Failed');
    } finally {
      setTimeout(() => setNotifMessage(''), 2000);
      setNotifSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This will schedule deletion in 30 days.')) return;
    const res = await deleteMyAccount();
    alert(res.message || res.error || 'Request sent');
  };

  const tabs = [
    { id: 'authentication', label: 'Authentication', icon: 'ri-shield-keyhole-line' },
    { id: 'profile', label: 'Profile', icon: 'ri-user-settings-line' },
    { id: 'notifications', label: 'Notifications', icon: 'ri-notification-3-line' },
    { id: 'privacy', label: 'Privacy', icon: 'ri-lock-line' },
    { id: 'security', label: 'Security', icon: 'ri-shield-check-line' }
  ];

  const TabContent = () => {
    switch (activeTab) {
      case 'authentication':
        return <AuthenticationSettings />;
      
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Profile Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={user?.profilePhoto || user?.avatar || "/default-avatar.png"}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                  <div>
                    <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                      Change Photo
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      defaultValue={user?.name || ''}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      defaultValue={user?.email || ''}
                      disabled
                      className="w-full p-2 border border-gray-300 rounded bg-gray-50 text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      defaultValue={user?.phone || ''}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      defaultValue={user?.location || ''}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    rows={3}
                    defaultValue={user?.bio || ''}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex justify-end">
                  <button className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Email Notifications</h4>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEmailNotifications(checked);
                        const updated = { ...notifPrefs, email: { ...notifPrefs.email } };
                        for (const k of ['rsvp','certificate','cohost','event_verification','host_request']) {
                          updated.email[k] = checked;
                        }
                        setNotifPrefs(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Push Notifications</h4>
                    <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setPushNotifications(checked);
                        const updated = { ...notifPrefs, inApp: { ...notifPrefs.inApp } };
                        for (const k of ['rsvp','certificate','cohost','event_verification','host_request']) {
                          updated.inApp[k] = checked;
                        }
                        setNotifPrefs(updated);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {['rsvp','certificate','cohost','event_verification','host_request'].map((cat) => (
                  <div key={`cat-${cat}`} className="grid grid-cols-1 md:grid-cols-3 items-center p-4 border border-gray-200 rounded-lg">
                    <div className="md:col-span-1">
                      <h4 className="font-medium text-gray-800 capitalize">{cat.replace('_',' ')}</h4>
                      <p className="text-sm text-gray-600">Email and in-app</p>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">Email</span>
                        <input
                          type="checkbox"
                          checked={!!notifPrefs.email[cat]}
                          onChange={(e) => setNotifPrefs({ ...notifPrefs, email: { ...notifPrefs.email, [cat]: e.target.checked } })}
                        />
                      </label>
                      <label className="flex items-center space-x-2">
                        <span className="text-sm text-gray-700">In-App</span>
                        <input
                          type="checkbox"
                          checked={!!notifPrefs.inApp[cat]}
                          onChange={(e) => setNotifPrefs({ ...notifPrefs, inApp: { ...notifPrefs.inApp, [cat]: e.target.checked } })}
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end space-x-2">
                  {notifMessage && <span className="text-sm text-gray-600 self-center">{notifMessage}</span>}
                  <button onClick={saveNotificationPrefs} disabled={notifSaving} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50">{notifSaving ? 'Saving...' : 'Save Preferences'}</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Privacy Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Profile Visibility</h4>
                    <p className="text-sm text-gray-600">Make your profile visible to other users</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Activity Status</h4>
                    <p className="text-sm text-gray-600">Show when you're active on the platform</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Data Analytics</h4>
                    <p className="text-sm text-gray-600">Allow us to collect usage data for improvements</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Security Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
                    Enable 2FA
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Login History</h4>
                    <p className="text-sm text-gray-600">View recent login activity</p>
                  </div>
                  <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                    View History
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">Active Sessions</h4>
                    <p className="text-sm text-gray-600">Manage your active login sessions</p>
                  </div>
                  <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">
                    Manage Sessions
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                  <div>
                    <h4 className="font-medium text-red-800">Delete Account</h4>
                    <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                  </div>
                  <button onClick={handleDeleteAccount} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Request Deletion</button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <AuthenticationSettings />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-md p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <i className={tab.icon}></i>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>

              {/* Dark Mode Toggle */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <i className="ri-moon-line text-gray-600"></i>
                    <span className="text-sm font-medium text-gray-700">Dark Mode</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              {/* Logout Button */}
              <div className="mt-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                >
                  <i className="ri-logout-box-r-line"></i>
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <TabContent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
