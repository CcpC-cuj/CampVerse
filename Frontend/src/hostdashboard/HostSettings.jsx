import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";

const HostSettings = () => {
  const { user, updateUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    organization: user?.organization || "",
    website: user?.website || "",
    location: user?.location || ""
  });
  
  // Editing state
  const [editing, setEditing] = useState({});
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    eventUpdates: true,
    participantMessages: true,
  // ...existing code...
    marketingEmails: false,
    weeklyReports: true,
    reminderNotifications: true
  });
  
  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    showEventHistory: true
  });
  
  // Event management preferences
  const [eventPreferences, setEventPreferences] = useState({
    autoApproval: false,
    requireVerification: true,
    allowWaitlist: true,
    sendWelcomeEmail: true,
    collectFeedback: true,
    enableCertificates: true
  });

  const handleProfileSave = async (field = null) => {
    setLoading(true);
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (field) {
        setEditing(prev => ({ ...prev, [field]: false }));
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProfileSave(field);
    }
  };

  const toggleEdit = (field) => {
    setEditing(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrivacyChange = (key, value) => {
    setPrivacy(prev => ({ ...prev, [key]: value }));
  };

  const handleEventPreferenceChange = (key) => {
    setEventPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderToggle = (checked, onChange) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={onChange}
      />
      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#9b5de5]"></div>
    </label>
  );
  return (
    // MATCHED to Dashboard outer gradient + typography
    <div className="min-h-screen h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
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
        <HostSidebar />
      </div>

      {/* main column — MATCHED to Dashboard lighter surface */}
      <div className="flex-1 flex flex-col overflow-hidden sm:pl-0 sm:ml-0 sm:w-full bg-[#141a45]">
        {/* Top Navigation */}
        <HostNavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={[]}
          searchQuery={""}
          setSearchQuery={() => {}}
        />

        {/* scrollable content — MATCHED surface color; stacked sections for scroll-through */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-[#141a45] scroll-smooth">
          <div className="max-w-6xl mx-auto">
            <h1
              className="text-2xl sm:text-3xl font-bold mb-4"
              style={{ textShadow: '0 0 10px rgba(155, 93, 229, 0.5)' }}
            >
              Host Settings
            </h1>
            <p className="text-gray-300 mb-6">
              Manage your profile, preferences, and event settings
            </p>

            {/* Save Success Message */}
            {saved && (
              <div className="mb-6 bg-green-500/20 border border-green-500/40 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
                <i className="ri-check-line"></i>
                Settings saved successfully!
              </div>
            )}

            {/* ===== Profile (FIRST) ===== */}
            <section className="space-y-6">
              <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <i className="ri-user-line text-[#9b5de5]"></i>
                  Profile Settings
                </h3>
                <div className="space-y-4">
                  {/* Profile Photo */}
                  <div className="flex items-center gap-4">
                    <img
                      src={user?.profilePhoto || user?.avatar || '/default-avatar.png'}
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
                        disabled={loading}
                        className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button transition-colors"
                      >
                        Change Photo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm text-gray-300 mb-1">Full Name</label>
                        {!editing.name ? (
                          <button
                            type="button"
                            onClick={() => toggleEdit('name')}
                            className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                            title="Edit name"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditing(prev => ({ ...prev, name: false }))}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title="Cancel editing"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={profileForm.name}
                        readOnly={!editing.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        onKeyPress={(e) => handleKeyPress(e, 'name')}
                        className={`w-full p-2 rounded bg-gray-900 border ${
                          !editing.name
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
                        {!editing.phone ? (
                          <button
                            type="button"
                            onClick={() => toggleEdit('phone')}
                            className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                            title="Edit phone"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditing(prev => ({ ...prev, phone: false }))}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title="Cancel editing"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        )}
                      </div>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        readOnly={!editing.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        onKeyPress={(e) => handleKeyPress(e, 'phone')}
                        className={`w-full p-2 rounded bg-gray-900 border ${
                          !editing.phone
                            ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                            : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm text-gray-300 mb-1">Organization</label>
                        {!editing.organization ? (
                          <button
                            type="button"
                            onClick={() => toggleEdit('organization')}
                            className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                            title="Edit organization"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditing(prev => ({ ...prev, organization: false }))}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title="Cancel editing"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={profileForm.organization}
                        readOnly={!editing.organization}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, organization: e.target.value }))}
                        onKeyPress={(e) => handleKeyPress(e, 'organization')}
                        className={`w-full p-2 rounded bg-gray-900 border ${
                          !editing.organization
                            ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                            : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-sm text-gray-300 mb-1">Bio</label>
                      {!editing.bio ? (
                        <button
                          type="button"
                          onClick={() => toggleEdit('bio')}
                          className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                          title="Edit bio"
                        >
                          <i className="ri-pencil-line text-sm"></i>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing(prev => ({ ...prev, bio: false }))}
                          className="text-gray-400 hover:text-white transition-colors p-1"
                          title="Cancel editing"
                        >
                          <i className="ri-close-line text-sm"></i>
                        </button>
                      )}
                    </div>
                    <textarea
                      value={profileForm.bio}
                      readOnly={!editing.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      className={`w-full p-2 rounded bg-gray-900 border ${
                        !editing.bio
                          ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                          : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                      }`}
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  {(editing.name || editing.phone || editing.organization || editing.bio) && (
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleProfileSave}
                        disabled={loading}
                        className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-2 rounded-button transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ===== Authentication ===== */}
            <section className="space-y-6">
              <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <i className="ri-shield-keyhole-line text-[#9b5de5]"></i>
                  Authentication Settings
                </h3>
                <div className="space-y-4">
                  <div className="text-gray-300">
                    <p>Manage your authentication settings and security preferences.</p>
                  </div>
                  {/* Add authentication components here when needed */}
                </div>
              </div>
            </section>

            {/* ===== Notifications ===== */}
            <section className="space-y-6">
              <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <i className="ri-notification-3-line text-[#9b5de5]"></i>
                  Notification Preferences
                </h3>
                <div className="space-y-6">
                  {[
                    { key: "emailNotifications", label: "Email Notifications", desc: "Receive notifications via email" },
                    { key: "pushNotifications", label: "Push Notifications", desc: "Receive push notifications in browser" },
                    { key: "eventUpdates", label: "Event Updates", desc: "Get notified about event changes" },
                    { key: "participantMessages", label: "Participant Messages", desc: "Receive messages from event participants" },
                    { key: "systemAlerts", label: "System Notifications", desc: "Important system notifications" },
                    { key: "marketingEmails", label: "Marketing Emails", desc: "Promotional content and updates" },
                    { key: "weeklyReports", label: "Weekly Reports", desc: "Weekly analytics and insights" },
                    { key: "reminderNotifications", label: "Event Reminders", desc: "Reminders about upcoming events" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-b-0">
                      <div>
                        <div className="font-medium text-white">{item.label}</div>
                        <div className="text-sm text-gray-400">{item.desc}</div>
                      </div>
                      {renderToggle(notifications[item.key], () => handleNotificationChange(item.key))}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ===== Privacy ===== */}
            <section className="space-y-6">
              <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <i className="ri-shield-keyhole-line text-[#9b5de5]"></i>
                  Privacy Settings
                </h3>
                <div className="space-y-6">
                  {/* Profile Visibility */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Profile Visibility</label>
                    <div className="space-y-2">
                      {[
                        { value: "public", label: "Public", desc: "Anyone can see your profile" },
                        { value: "participants", label: "Participants Only", desc: "Only event participants can see your profile" },
                        { value: "private", label: "Private", desc: "Only you can see your profile" }
                      ].map((option) => (
                        <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="radio"
                            name="profileVisibility"
                            value={option.value}
                            checked={privacy.profileVisibility === option.value}
                            onChange={(e) => handlePrivacyChange('profileVisibility', e.target.value)}
                            className="form-radio h-4 w-4 text-[#9b5de5] bg-gray-700 border-gray-600 focus:ring-[#9b5de5]"
                          />
                          <div>
                            <div className="text-white font-medium">{option.label}</div>
                            <div className="text-sm text-gray-400">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-white">Contact Information</h4>
                    
                    <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                      <div>
                        <div className="font-medium text-white">Show Email Address</div>
                        <div className="text-sm text-gray-400">Allow others to see your email</div>
                      </div>
                      {renderToggle(privacy.showEmail, () => handlePrivacyChange('showEmail', !privacy.showEmail))}
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-700/50">
                      <div>
                        <div className="font-medium text-white">Show Phone Number</div>
                        <div className="text-sm text-gray-400">Allow others to see your phone</div>
                      </div>
                      {renderToggle(privacy.showPhone, () => handlePrivacyChange('showPhone', !privacy.showPhone))}
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <div className="font-medium text-white">Allow Direct Messages</div>
                        <div className="text-sm text-gray-400">Let participants send you messages</div>
                      </div>
                      {renderToggle(privacy.allowMessages, () => handlePrivacyChange('allowMessages', !privacy.allowMessages))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ===== Event Management ===== */}
            <section className="space-y-6">
              <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <i className="ri-calendar-event-line text-[#9b5de5]"></i>
                  Event Management Preferences
                </h3>
                <div className="space-y-6">
                  {[
                    { key: "autoApproval", label: "Auto-approve Registrations", desc: "Automatically approve participant registrations" },
                    { key: "requireVerification", label: "Require Email Verification", desc: "Participants must verify their email before joining" },
                    { key: "allowWaitlist", label: "Enable Waitlist", desc: "Allow participants to join waitlist when event is full" },
                    { key: "sendWelcomeEmail", label: "Send Welcome Emails", desc: "Send welcome email to new participants" },
                    { key: "collectFeedback", label: "Collect Feedback", desc: "Request feedback from participants after events" },
                    { key: "enableCertificates", label: "Enable Certificates", desc: "Generate completion certificates for participants" }
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-700/50 last:border-b-0">
                      <div>
                        <div className="font-medium text-white">{item.label}</div>
                        <div className="text-sm text-gray-400">{item.desc}</div>
                      </div>
                      {renderToggle(eventPreferences[item.key], () => handleEventPreferenceChange(item.key))}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ===== Security ===== */}
            <section className="space-y-6">
              <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <i className="ri-lock-line text-[#9b5de5]"></i>
                  Security Settings
                </h3>
                <div className="space-y-6">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-4">Password</h4>
                    <button className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-lg transition-all">
                      Change Password
                    </button>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-white mb-4">Two-Factor Authentication</h4>
                    <p className="text-gray-400 text-sm mb-4">Add an extra layer of security to your account</p>
                    <button className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-all">
                      Enable 2FA
                    </button>
                  </div>

                  <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4">
                    <h4 className="text-lg font-medium text-red-400 mb-4">Danger Zone</h4>
                    <p className="text-gray-300 text-sm mb-4">Permanently delete your account and all associated data</p>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostSettings;
