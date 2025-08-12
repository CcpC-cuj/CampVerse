import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthenticationSettings from '../components/AuthenticationSettings';
import Sidebar from './sidebar';
import { useNavigate } from 'react-router-dom';
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  deleteMyAccount,
  updateMe,
  uploadProfilePhoto
} from '../api';

const Settings = () => {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();

  // layout state (to keep dashboard sidebar exactly as in dashboard)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // tabs (moved to top navbar)
  const [activeTab, setActiveTab] = useState('authentication');

  // notifications state (unchanged functionality)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState({ email: {}, inApp: {} });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');

  // profile state (unchanged functionality)
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(
    user?.profilePhoto || user?.avatar || '/default-avatar.png'
  );
  const [profileMessage, setProfileMessage] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const fileInputRef = useRef();

  const [editingField, setEditingField] = useState(null); // 'name' | 'phone' | 'location' | 'bio' | null
  const nameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const locationInputRef = useRef(null);
  const bioInputRef = useRef(null);

  // keep inputs synced with user unless editing
  useEffect(() => {
    if (editingField) return;
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setLocation(user?.location || '');
    setBio(user?.bio || '');
    setProfilePhoto(user?.profilePhoto || user?.avatar || '/default-avatar.png');
  }, [user?._id, editingField]);

  // focus lock for editing fields
  useEffect(() => {
    const map = { name: nameInputRef, phone: phoneInputRef, location: locationInputRef, bio: bioInputRef };
    const ref = editingField ? map[editingField] : null;
    if (ref?.current) {
      const el = ref.current;
      el.focus();
      try {
        const len = el.value?.length ?? 0;
        if (typeof el.setSelectionRange === 'function') el.setSelectionRange(len, len);
      } catch {}
    }
  }, [editingField, name, phone, location, bio]);

  const startEditing = (f) => setEditingField(f);
  const stopEditing = () => setEditingField(null);
  const handleLogout = () => logout();

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await getMyNotificationPreferences();
        const safe = prefs || { email: {}, inApp: {} };
        setNotifPrefs(safe);
        const emailAny = Object.values(safe.email || {}).some(Boolean);
        const inAppAny = Object.values(safe.inApp || {}).some(Boolean);
        setEmailNotifications(emailAny);
        setPushNotifications(inAppAny);
      } catch {}
    };
    loadPrefs();
  }, []);

  const saveNotificationPrefs = async () => {
    try {
      setNotifSaving(true);
      const res = await updateMyNotificationPreferences({
        email: notifPrefs.email,
        inApp: notifPrefs.inApp
      });
      setNotifMessage(res && res.message ? 'Saved' : (res.error || 'Failed'));
    } catch {
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

  // profile photo upload
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileSaving(true);
    setProfileMessage('Uploading...');
    try {
      const res = await uploadProfilePhoto(file);
      if (res.user?.profilePhoto) {
        setProfilePhoto(res.user.profilePhoto);
        setProfileMessage('Profile photo updated!');
        if (res.user) setUser(res.user);
      } else {
        setProfileMessage(res.error || 'Failed to update photo');
      }
    } catch {
      setProfileMessage('Failed to update photo');
    } finally {
      setTimeout(() => setProfileMessage(''), 2000);
      setProfileSaving(false);
    }
  };

  // save profile fields
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage('Saving...');
    try {
      const res = await updateMe({ name, phone, location, bio });
      if (res.user) {
        setProfileMessage('Profile updated!');
        setUser(res.user);
      } else {
        setProfileMessage(res.error || 'Failed to update profile');
      }
    } catch {
      setProfileMessage('Failed to update profile');
    } finally {
      setTimeout(() => setProfileMessage(''), 2000);
      setProfileSaving(false);
    }
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
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-4">Profile Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/default-avatar.png';
                    }}
                  />
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={profileSaving}
                      className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button transition-colors"
                    >
                      Change Photo
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handlePhotoChange}
                    />
                  </div>
                  {profileMessage && (
                    <span className="text-sm text-gray-300">{profileMessage}</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                      {editingField !== 'name' ? (
                        <button
                          type="button"
                          onClick={() => startEditing('name')}
                          className="text-sm text-[#cbb3ff]"
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopEditing}
                          className="text-sm text-gray-400"
                        >
                          Done
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      ref={nameInputRef}
                      value={name}
                      readOnly={editingField !== 'name'}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full p-2 rounded bg-gray-900 border ${
                        editingField !== 'name'
                          ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                          : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full p-2 rounded bg-gray-900 border border-gray-800 text-gray-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm text-gray-300 mb-1">Phone</label>
                      {editingField !== 'phone' ? (
                        <button
                          type="button"
                          onClick={() => startEditing('phone')}
                          className="text-sm text-[#cbb3ff]"
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopEditing}
                          className="text-sm text-gray-400"
                        >
                          Done
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      ref={phoneInputRef}
                      value={phone}
                      readOnly={editingField !== 'phone'}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full p-2 rounded bg-gray-900 border ${
                        editingField !== 'phone'
                          ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                          : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm text-gray-300 mb-1">Location</label>
                      {editingField !== 'location' ? (
                        <button
                          type="button"
                          onClick={() => startEditing('location')}
                          className="text-sm text-[#cbb3ff]"
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopEditing}
                          className="text-sm text-gray-400"
                        >
                          Done
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      ref={locationInputRef}
                      value={location}
                      readOnly={editingField !== 'location'}
                      onChange={(e) => setLocation(e.target.value)}
                      className={`w-full p-2 rounded bg-gray-900 border ${
                        editingField !== 'location'
                          ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                          : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm text-gray-300 mb-1">Bio</label>
                    {editingField !== 'bio' ? (
                      <button
                        type="button"
                        onClick={() => startEditing('bio')}
                        className="text-sm text-[#cbb3ff]"
                      >
                        Edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopEditing}
                        className="text-sm text-gray-400"
                      >
                        Done
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    ref={bioInputRef}
                    value={bio}
                    readOnly={editingField !== 'bio'}
                    onChange={(e) => setBio(e.target.value)}
                    className={`w-full p-2 rounded bg-gray-900 border ${
                      editingField !== 'bio'
                        ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                        : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                    }`}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-2 rounded-button transition-colors disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-4">Notification Preferences</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                  <div>
                    <h4 className="font-medium">Email Notifications</h4>
                    <p className="text-sm text-gray-400">Receive notifications via email</p>
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
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#9b5de5] after:content-[''] after:absolute after:w-5 after:h-5 after:rounded-full after:bg-white after:top-[2px] after:left-[2px] after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                  <div>
                    <h4 className="font-medium">Push Notifications</h4>
                    <p className="text-sm text-gray-400">Receive in-app notifications</p>
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
                    <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#9b5de5] after:content-[''] after:absolute after:w-5 after:h-5 after:rounded-full after:bg-white after:top-[2px] after:left-[2px] after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>

                {['rsvp','certificate','cohost','event_verification','host_request'].map((cat) => (
                  <div key={`cat-${cat}`} className="grid grid-cols-1 md:grid-cols-3 items-center p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                    <div className="md:col-span-1">
                      <h4 className="font-medium capitalize">{cat.replace('_',' ')}</h4>
                      <p className="text-sm text-gray-400">Email and in-app</p>
                    </div>
                    <div className="flex items-center justify-between md:col-span-2">
                      <label className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">Email</span>
                        <input
                          type="checkbox"
                          checked={!!notifPrefs.email[cat]}
                          onChange={(e) =>
                            setNotifPrefs({ ...notifPrefs, email: { ...notifPrefs.email, [cat]: e.target.checked } })
                          }
                        />
                      </label>
                      <label className="flex items-center gap-2">
                        <span className="text-sm text-gray-300">In-App</span>
                        <input
                          type="checkbox"
                          checked={!!notifPrefs.inApp[cat]}
                          onChange={(e) =>
                            setNotifPrefs({ ...notifPrefs, inApp: { ...notifPrefs.inApp, [cat]: e.target.checked } })
                          }
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2">
                  {notifMessage && (
                    <span className="text-sm text-gray-300 self-center">{notifMessage}</span>
                  )}
                  <button
                    onClick={saveNotificationPrefs}
                    disabled={notifSaving}
                    className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button disabled:opacity-50"
                  >
                    {notifSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-4">Privacy Settings</h3>

              <div className="space-y-4">
                {[
                  { title: 'Profile Visibility', desc: 'Make your profile visible to other users', def: true },
                  { title: 'Activity Status', desc: "Show when you're active on the platform", def: true },
                  { title: 'Data Analytics', desc: 'Allow usage data to improve the product', def: true }
                ].map((row, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                    <div>
                      <h4 className="font-medium">{row.title}</h4>
                      <p className="text-sm text-gray-400">{row.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={row.def} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-[#9b5de5] after:content-[''] after:absolute after:w-5 after:h-5 after:rounded-full after:bg-white after:top-[2px] after:left-[2px] after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
              <h3 className="text-xl font-semibold mb-4">Security Settings</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                  <div>
                    <h4 className="font-medium">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-400">Add an extra layer of security</p>
                  </div>
                  <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button">
                    Enable 2FA
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                  <div>
                    <h4 className="font-medium">Login History</h4>
                    <p className="text-sm text-gray-400">View recent login activity</p>
                  </div>
                  <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-button">
                    View History
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gray-900/40">
                  <div>
                    <h4 className="font-medium">Active Sessions</h4>
                    <p className="text-sm text-gray-400">Manage your active sessions</p>
                  </div>
                  <button className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-button">
                    Manage Sessions
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-red-500/30 rounded-lg bg-red-500/10">
                  <div>
                    <h4 className="font-medium text-red-300">Delete Account</h4>
                    <p className="text-sm text-red-300/80">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-button"
                  >
                    Request Deletion
                  </button>
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
    // MATCHED to Dashboard outer gradient + typography
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* mobile overlay for sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* dashboard sidebar (component handles its own bg) */}
      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 z-50 transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 sm:translate-x-0`}
      >
        <Sidebar />
      </div>

      {/* main column — MATCHED to Dashboard lighter surface */}
      <div className="flex-1 flex flex-col overflow-hidden sm:pl-0 sm:ml-0 sm:w-full bg-[#141a45]">
        {/* sticky top bar with back + horizontal tabs */}
        <div className="sticky top-0 z-30 bg-transparent">
          <div className="px-4 sm:px-6 py-3">
            <div className="flex items-center gap-3 sm:gap-4 bg-gray-800/60 border border-gray-700 rounded-xl px-4 sm:px-6 py-3">
              {/* hamburger for mobile */}
              <button
                className="sm:hidden p-2 rounded-lg bg-gray-800/70 text-white"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <i className="ri-menu-line text-lg"></i>
              </button>

              {/* back to dashboard */}
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-2 rounded-button bg-gray-800/60 hover:bg-gray-800/80 flex items-center gap-2"
                title="Back to Dashboard"
              >
                <i className="ri-arrow-left-line"></i>
                <span className="hidden sm:inline">Back</span>
              </button>

              {/* tabs as top nav */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex items-center gap-2 sm:gap-3 min-w-max">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-3 sm:px-4 py-2 rounded-full whitespace-nowrap flex items-center gap-2 transition-colors ${
                        activeTab === t.id
                          ? 'bg-[#9b5de5] text-white'
                          : 'text-gray-300 hover:bg-[#9b5de5]/20'
                      }`}
                    >
                      <i className={t.icon}></i>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* logout on right */}
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-button border border-red-500/40 text-red-300 hover:bg-red-500/10"
                title="Logout"
              >
                <i className="ri-logout-box-r-line"></i>
              </button>
            </div>
          </div>
        </div>

        {/* scrollable content — MATCHED surface color */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-[#141a45]">
          <div className="max-w-6xl mx-auto">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-4"
              style={{ textShadow: '0 0 10px rgba(155, 93, 229, 0.5)' }}
            >
              Settings
            </h1>
            <p className="text-gray-300 mb-6">
              Manage your account settings and preferences
            </p>

            <TabContent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
