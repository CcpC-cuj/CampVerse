import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import HostRegistrationModal from './HostRegistrationModal'; // ✅ ADDED
import NavBar from './NavBar';

const Settings = () => {
  const navigate = useNavigate();
  const { user, setUser, logout, refreshUser } = useAuth();

  // layout state (to keep dashboard sidebar exactly as in dashboard)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // active section highlight for top navbar (purely visual; content is stacked)
  const [activeTab, setActiveTab] = useState('profile');
  
  // Flag to prevent initial scroll interference
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // section refs for stacked scrolling
  const containerRef = useRef(null);
  const profileRef = useRef(null);
  const authRef = useRef(null);
  const notificationsRef = useRef(null);
  const privacyRef = useRef(null);
  const securityRef = useRef(null);

  // ✅ ADDED: local state to control the host modal
  const [showHostModal, setShowHostModal] = useState(false);

  // Reset scroll position when component mounts and disable scroll restoration
  useEffect(() => {
    // Refresh user data on component mount to ensure latest status
    refreshUser();

    // Disable browser scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Aggressive scroll reset function
    const resetScroll = () => {
      // Reset all possible scroll containers immediately
      const container = containerRef.current;
      if (container) {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      }
      
      // Reset window and document scroll
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.documentElement.scrollLeft = 0;
      document.body.scrollTop = 0;
      document.body.scrollLeft = 0;
      
      // Force scroll to top using requestAnimationFrame for immediate effect
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      });
    };
    
    // Reset immediately
    resetScroll();
    
    // Multiple resets to handle different render phases
    const timeouts = [
      setTimeout(resetScroll, 0),
      setTimeout(resetScroll, 10),
      setTimeout(resetScroll, 50),
      setTimeout(() => {
        resetScroll();
        setIsInitialLoad(false); // Allow intersection observer to work after reset
      }, 100)
    ];
    
    return () => {
      timeouts.forEach(clearTimeout);
      // Restore normal scroll behavior when leaving
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);

const [gender, setGender] = useState(user?.gender || '');
const [dob, setDob] = useState(user?.dateOfBirth || '');
const [collegeIdNumber, setCollegeIdNumber] = useState(user?.collegeIdNumber || '');
const [interests, setInterests] = useState(user?.interests || []);
const [learningGoals, setLearningGoals] = useState(user?.learningGoals || []);
const [skills, setSkills] = useState(user?.skills || []);
const [institution, setInstitution] = useState(user?.institution || null);


//: preferences
  const [preferences, setPreferences] = useState({ interests: [], skills: [], learningGoals: [] });
  const [interestInput, setInterestInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [goalInput, setGoalInput] = useState('');



const SUGGESTED_INTERESTS = ['Hackathons', 'Robotics', 'AI/ML', 'Open Source', 'Sports', 'Cultural', 'Debate', 'Entrepreneurship'];
const SUGGESTED_SKILLS = ['JavaScript', 'Python', 'C++', 'UI/UX', 'Data Science', 'Public Speaking', 'Leadership'];
const SUGGESTED_GOALS = ['Get internship', 'Win a hackathon', 'Publish a paper', 'Improve DSA', 'Learn design'];


const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 px-2 py-1 rounded text-sm">
    {label}
    {onRemove && (
      <button aria-label={`Remove ${label}`} onClick={onRemove} className="text-slate-400 hover:text-white">×</button>
    )}
  </span>
);

const SuggestionPills = ({ items, onPick }) => (
  <div className="flex flex-wrap gap-2 mt-2">
    {items.map((s) => (
      <button key={s} onClick={() => onPick(s)} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs hover:bg-slate-700">
        + {s}
      </button>
    ))}
  </div>
);

  // Filter suggestions to hide already selected items
  const filteredInterestSuggestions = useMemo(
    () => SUGGESTED_INTERESTS.filter(s => !(preferences.interests || []).includes(s)),
    [preferences.interests]
  );

    const filteredSkillSuggestions = useMemo(
      () => SUGGESTED_SKILLS.filter(s => !(preferences.skills || []).includes(s)),
      [preferences.skills]
    );
    const filteredGoalSuggestions = useMemo(
      () => SUGGESTED_GOALS.filter(s => !(preferences.learningGoals || []).includes(s)),
      [preferences.learningGoals]
    );
  



  const DEFAULT_AVATARS = {
  male: "/male-avatar.png",
  female: "/female-avatar.png",
  other: "/other-avatar.png",
};


useEffect(() => {
  if (editingField) return;

  setName(user?.name || '');
  setPhone(user?.phone || '');
  setLocation(user?.location || '');
  setBio(user?.bio || '');
  setGender(user?.gender || '');
  setDob(user?.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '');
  setCollegeIdNumber(user?.collegeIdNumber || '');
  setInterests(user?.interests || []);
  setSkills(user?.skills || []);
  setLearningGoals(user?.learningGoals || []);
  setInstitution(user?.institution || null);

// Determine the profile photo
  let photo = '/default-avatar.png'; // default fallback

  if (user?.profilePhoto && user.profilePhoto.trim() !== '') {
    photo = user.profilePhoto;
  } else if (user?.avatar && user.avatar.trim() !== '') {
    photo = user.avatar;
  } else if (user?.gender) {
    const genderKey = String(user.gender).trim().toLowerCase(); // ensure string and lowercase
    if (DEFAULT_AVATARS[genderKey]) {
      photo = DEFAULT_AVATARS[genderKey];
    }
  }
  setProfilePhoto(photo);
}, [user?._id, editingField]);


  // keep inputs synced with user unless editing
  // useEffect(() => {
  //   if (editingField) return;
  //   setName(user?.name || '');
  //   setPhone(user?.phone || '');
  //   setLocation(user?.location || '');
  //   setBio(user?.bio || '');
  //   setProfilePhoto(user?.profilePhoto || user?.avatar || '/default-avatar.png');
  // }, [user?._id, editingField]);







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
  // const handleSaveProfile = async () => {
  //   setProfileSaving(true);
  //   setProfileMessage('Saving...');
  //   try {
  //     const res = await updateMe({ name, phone, location, bio });
  //     if (res.user) {
  //       setProfileMessage('Profile updated!');
  //       setUser(res.user);
  //       stopEditing(); // Auto-close editing mode after save
  //     } else {
  //       setProfileMessage(res.error || 'Failed to update profile');
  //     }
  //   } catch {
  //     setProfileMessage('Failed to update profile');
  //   } finally {
  //     setTimeout(() => setProfileMessage(''), 2000);
  //     setProfileSaving(false);
  //   }
  // };

const handleSaveProfile = async () => {
  setProfileSaving(true);
  setProfileMessage('Saving...');
  try {
    const res = await updateMe({
      name,
      phone,
      location,
      bio,
      gender,
      dateOfBirth: dob,
      collegeIdNumber,
      interests,
      skills,
      learningGoals,
      institution: institution?._id || null
    });
    if (res.user) {
      setProfileMessage('Profile updated!');
      setUser(res.user);
      stopEditing();
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



  // Handle Enter key press for profile fields
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && editingField) {
      e.preventDefault();
      handleSaveProfile();
    }
  };

  // NAV TABS — reordered so Profile comes first, then Authentication
  const tabs = [
    { id: 'profile', label: 'Profile', icon: 'ri-user-settings-line', ref: profileRef },
    { id: 'authentication', label: 'Authentication', icon: 'ri-shield-keyhole-line', ref: authRef },
    { id: 'notifications', label: 'Notifications', icon: 'ri-notification-3-line', ref: notificationsRef },
    { id: 'privacy', label: 'Privacy', icon: 'ri-lock-line', ref: privacyRef },
    { id: 'security', label: 'Security', icon: 'ri-shield-check-line', ref: securityRef }
  ];

  // Smooth-scroll to a section inside scroll container
  const scrollTo = (sectionRef) => {
    const node = sectionRef?.current;
    const container = containerRef?.current;
    if (!node || !container) return;
    const containerTop = container.getBoundingClientRect().top;
    const nodeTop = node.getBoundingClientRect().top;
    const currentScroll = container.scrollTop;
    const offset = nodeTop - containerTop - 12; // small padding for sticky bar
    container.scrollTo({ top: currentScroll + offset, behavior: 'smooth' });
  };

  // Highlight active tab while scrolling (design only)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isInitialLoad) return;

    // Delay the intersection observer to avoid interfering with initial scroll reset
    const timeoutId = setTimeout(() => {
      const options = {
        root: container,
        rootMargin: '0px 0px -55% 0px',
        threshold: 0.2
      };

      const sections = [
        { id: 'profile', el: profileRef.current },
        { id: 'authentication', el: authRef.current },
        { id: 'notifications', el: notificationsRef.current },
        { id: 'privacy', el: privacyRef.current },
        { id: 'security', el: securityRef.current }
      ].filter(s => s.el);

      const observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const hit = sections.find(s => s.el === visible.target);
          if (hit?.id) setActiveTab(hit.id);
        }
      }, options);

      sections.forEach(s => observer.observe(s.el));
      
      return () => observer.disconnect();
    }, 200); // Delay to let scroll reset complete

    return () => clearTimeout(timeoutId);
  }, [isInitialLoad]);

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
        <Sidebar />
      </div>

      {/* main column — MATCHED to Dashboard lighter surface */}
      <div className="flex-1 flex flex-col overflow-hidden sm:pl-0 sm:ml-0 sm:w-full bg-[#141a45]">
        {/* Top Navigation */}
        <NavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={[]}
          searchQuery={""}
          setSearchQuery={() => {}}
        />

        {/* scrollable content — MATCHED surface color; stacked sections for scroll-through */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-[#141a45]"
          style={{ scrollBehavior: 'auto' }}
        >
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

            {/* ===== Profile (FIRST) ===== */}
            <section
              id="profile"
              ref={profileRef}
              className="scroll-mt-0"
            >
              <div className="space-y-6">
                <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
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
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit name"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          ref={nameInputRef}
                          value={name}
                          readOnly={editingField !== 'name'}
                          onChange={(e) => setName(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className={`w-full p-2 rounded bg-gray-900 border ${
                            editingField !== 'name'
                              ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                              : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-gray-300 mb-1 p-1">Email</label>
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
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit phone"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>
                        <input
                          type="tel"
                          ref={phoneInputRef}
                          value={phone}
                          readOnly={editingField !== 'phone'}
                          onChange={(e) => setPhone(e.target.value)}
                          onKeyPress={handleKeyPress}
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
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit location"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          ref={locationInputRef}
                          value={location}
                          readOnly={editingField !== 'location'}
                          onChange={(e) => setLocation(e.target.value)}
                          onKeyPress={handleKeyPress}
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
                            className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                            title="Edit bio"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopEditing}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title="Cancel editing"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        ref={bioInputRef}
                        value={bio}
                        readOnly={editingField !== 'bio'}
                        onChange={(e) => setBio(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className={`w-full p-2 rounded bg-gray-900 border ${
                          editingField !== 'bio'
                            ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                            : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                        }`}
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                                      {/* Gender (editable with select) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-sm text-gray-300 mb-1">Gender</label>
                          {editingField !== 'gender' ? (
                            <button
                              type="button"
                              onClick={() => startEditing('gender')}
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit gender"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          disabled={editingField !== 'gender'}
                          className={`w-full p-2 rounded bg-gray-900 border ${
                            editingField !== 'gender'
                              ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                              : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                          }`}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* Date of Birth (editable) */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-sm text-gray-300 mb-1">Date of Birth</label>
                          {editingField !== 'dob' ? (
                            <button
                              type="button"
                              onClick={() => startEditing('dob')}
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit date of birth"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>
                        <input
                          type="date"
                          value={dob || ''}
                          onChange={(e) => setDob(e.target.value)}
                          readOnly={editingField !== 'dob'}
                          className={`w-full p-2 rounded bg-gray-900 border ${
                            editingField !== 'dob'
                              ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                              : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                          }`}
                        />
                      </div>

                      {/* College ID (editable) */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-sm text-gray-300 mb-1">College / Enrollment Number</label>
                          {editingField !== 'collegeIdNumber' ? (
                            <button
                              type="button"
                              onClick={() => startEditing('collegeIdNumber')}
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit college ID"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={collegeIdNumber}
                          readOnly={editingField !== 'collegeIdNumber'}
                          onChange={(e) => setCollegeIdNumber(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className={`w-full p-2 rounded bg-gray-900 border ${
                            editingField !== 'collegeIdNumber'
                              ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                              : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                          }`}
                        />
                      </div>


                      {/* Institution (editable) */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-sm text-gray-300 mb-1">Institution</label>
                          {editingField !== 'institution' ? (
                            <button
                              type="button"
                              onClick={() => startEditing('institution')}
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit institution"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>
                       <input 
                          type="text"
                          value={institution?.name || ''}
                          readOnly={editingField !== 'institution'}
                          onChange={(e) =>
                            setInstitution((prev) => ({ ...(prev || {}), name: e.target.value }))
                          }
                          onKeyPress={handleKeyPress}
                          className={`w-full p-2 rounded bg-gray-900 border ${
                            editingField !== 'institution'
                              ? 'border-gray-800 text-gray-500 cursor-not-allowed'
                              : 'border-gray-700 focus:border-[#9b5de5] focus:ring-2 focus:ring-[#9b5de5]'
                          }`}
                        />
                      </div>
                    </div>

                                             {/* Learning Goals */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm text-gray-300 mb-1">Learning Goals</label>
                        {editingField !== 'learningGoals' ? (
                          <button
                            type="button"
                            onClick={() => startEditing('learningGoals')}
                            className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                            title="Edit learning goals"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopEditing}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title="Cancel editing"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        )}
                      </div>

                      {editingField === 'learningGoals' ? (
                        <>
                          <div className="flex gap-2 mt-1">
                            <input
                              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2"
                              value={goalInput}
                              onChange={(e) => setGoalInput(e.target.value)}
                              placeholder="Add goal and press +"
                            />
                            <button
                              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-3 rounded"
                              onClick={() => {
                                if (goalInput.trim()) {
                                  setLearningGoals([...learningGoals, goalInput.trim()]);
                                  setGoalInput('');
                                }
                              }}
                            >
                              +
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {learningGoals.map((v, i) => (
                              <Chip key={`${v}-${i}`} label={v} onRemove={() => {
                                setLearningGoals(learningGoals.filter((_, idx) => idx !== i));
                              }} />
                            ))}
                          </div>
                          <SuggestionPills items={filteredGoalSuggestions} onPick={(v) => setLearningGoals([...learningGoals, v])} />
                        </>
                      ) : (
                        <div className="text-gray-400 p-1 border border-gray-700 rounded-sm bg-gray-900/40 bg-gray-900/40">{learningGoals.join(', ') || 'No goals added'}</div>
                      )}
                    </div>

                              {/* Skills */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm text-gray-300 mb-1">Skills</label>
                        {editingField !== 'skills' ? (
                          <button
                            type="button"
                            onClick={() => startEditing('skills')}
                            className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                            title="Edit skills"
                          >
                            <i className="ri-pencil-line text-sm"></i>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={stopEditing}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            title="Cancel editing"
                          >
                            <i className="ri-close-line text-sm"></i>
                          </button>
                        )}
                      </div>

                      {editingField === 'skills' ? (
                        <>
                          <div className="flex gap-2 mt-1">
                            <input
                              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2"
                              value={skillInput}
                              onChange={(e) => setSkillInput(e.target.value)}
                              placeholder="Add skill and press +"
                            />
                            <button
                              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-3 rounded"
                              onClick={() => {
                                if (skillInput.trim()) {
                                  setSkills([...skills, skillInput.trim()]);
                                  setSkillInput('');
                                }
                              }}
                            >
                              +
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {skills.map((v, i) => (
                              <Chip key={`${v}-${i}`} label={v} onRemove={() => {
                                setSkills(skills.filter((_, idx) => idx !== i));
                              }} />
                            ))}
                          </div>
                          <SuggestionPills items={filteredSkillSuggestions} onPick={(v) => setSkills([...skills, v])} />
                        </>
                      ) : (
                        <div className="text-gray-400 p-1 border border-gray-700 rounded-sm bg-gray-900/40">{skills.join(', ') || 'No skills added'}</div>
                      )}
                    </div>

                      {/* Interests (editable textarea) */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="block text-sm text-gray-300 mb-1">Interests</label>
                          {editingField !== 'interests' ? (
                            <button
                              type="button"
                              onClick={() => startEditing('interests')}
                              className="text-gray-400 hover:text-[#9b5de5] transition-colors p-1"
                              title="Edit interests"
                            >
                              <i className="ri-pencil-line text-sm"></i>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={stopEditing}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                              title="Cancel editing"
                            >
                              <i className="ri-close-line text-sm"></i>
                            </button>
                          )}
                        </div>

                        {editingField === 'interests' ? (
                          <>
                            <div className="flex gap-2 mt-1">
                              <input
                                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2"
                                value={interestInput}
                                onChange={(e) => setInterestInput(e.target.value)}
                                placeholder="Add interest and press +"
                              />
                              <button
                                className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-3 rounded"
                                onClick={() => {
                                  if (interestInput.trim()) {
                                    setInterests([...interests, interestInput.trim()]);
                                    setInterestInput('');
                                  }
                                }}
                              >
                                +
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {interests.map((v, i) => (
                                <Chip key={`${v}-${i}`} label={v} onRemove={() => {
                                  setInterests(interests.filter((_, idx) => idx !== i));
                                }} />
                              ))}
                            </div>
                            <SuggestionPills items={filteredInterestSuggestions} onPick={(v) => setInterests([...interests, v])} />
                          </>
                        ) : (
                          <div className="text-gray-400 p-1 border border-gray-700 rounded-sm bg-gray-900/40">{interests.join(', ') || 'No interests added'}</div>
                        )}
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

                    {/* ✅ FIXED: Host CTA Logic - Check if user is already a verified host */}
                    <div className="mt-4 flex items-center justify-between p-4 border border-[#9b5de5]/30 rounded-lg bg-[#9b5de5]/10">
                      <div>
                        {user?.hostEligibilityStatus?.status === 'approved' && user?.canHost ? (
                          <>
                            <h4 className="font-medium text-[#cbb3ff]">You're a verified host!</h4>
                            <p className="text-sm text-[#cbb3ff]/80">
                              Access your host dashboard to manage events and attendees.
                            </p>
                          </>
                        ) : (
                          <>
                            <h4 className="font-medium text-[#cbb3ff]">Want to become a host?</h4>
                            <p className="text-sm text-[#cbb3ff]/80">
                              Start hosting events and manage attendees from your host dashboard.
                            </p>
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {user?.hostEligibilityStatus?.status === 'approved' && user?.canHost ? (
                          <button
                            type="button"
                            onClick={() => navigate('/host/manage-events')}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-button"
                          >
                            Go to Host Dashboard
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowHostModal(true)}
                            className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button"
                          >
                            Become a Host
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={refreshUser}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-button text-sm"
                        >
                          Refresh Data
                        </button>
                      </div>
                    </div>
                    {/* ✅ /FIXED */}
                  </div>
                </div>
              </div>
            </section>

            {/* ===== Authentication (SECOND) — now full-width with matching card wrapper ===== */}
            <section
              id="authentication"
              ref={authRef}
              className="mt-8 scroll-mt-0"
            >
              <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-0 sm:p-6 text-white">
                {/* No functionality change; just wrapped for full-width and visual parity */}
                <AuthenticationSettings />
              </div>
            </section>

            {/* ===== Notifications ===== */}
            <section
              id="notifications"
              ref={notificationsRef}
              className="mt-8 scroll-mt-0"
            >
              <div className="space-y-6">
                <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
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
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!notifPrefs.email[cat]}
                                onChange={(e) =>
                                  setNotifPrefs({ ...notifPrefs, email: { ...notifPrefs.email, [cat]: e.target.checked } })
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:bg-[#9b5de5] after:content-[''] after:absolute after:w-4 after:h-4 after:rounded-full after:bg-white after:top-[2px] after:left-[2px] after:transition-all peer-checked:after:translate-x-4"></div>
                            </label>
                          </label>
                          <label className="flex items-center gap-2">
                            <span className="text-sm text-gray-300">In-App</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!notifPrefs.inApp[cat]}
                                onChange={(e) =>
                                  setNotifPrefs({ ...notifPrefs, inApp: { ...notifPrefs.inApp, [cat]: e.target.checked } })
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:bg-[#9b5de5] after:content-[''] after:absolute after:w-4 after:h-4 after:rounded-full after:bg-white after:top-[2px] after:left-[2px] after:transition-all peer-checked:after:translate-x-4"></div>
                            </label>
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
            </section>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 mb-8">
            {/* ===== Privacy ===== */}
            <section
              id="privacy"
              ref={privacyRef}
              className="mt-8 scroll-mt-0"
            >
              <div className="space-y-6">
                <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
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
            </section>

            {/* ===== Security ===== */}
            <section
              id="security"
              ref={securityRef}
              className="mt-8 mb-8 scroll-mt-0"
            >
              <div className="space-y-6">
                <div className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-6 text-white">
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

                    {/* Delete Account — colors switched from red to purple, no functionality change */}
                    
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className="flex items-center justify-between p-4 border border-[#9b5de5]/30 rounded-lg bg-[#9b5de5]/10">
                      <div>
                        <h4 className="font-medium text-[#cbb3ff]">Delete Account</h4>
                        <p className="text-sm text-[#cbb3ff]/80">
                          Permanently delete your account and all data
                        </p>
                      </div>
                      <button
                        onClick={handleDeleteAccount}
                        className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-4 py-2 rounded-button"
                      >
                        Request Deletion
                      </button>
                    </div>

          </div>
        </div>
      </div>


      {/* ✅ ADDED: Modal mount */}
      <HostRegistrationModal
        open={showHostModal}
        onClose={() => setShowHostModal(false)}
        defaultEmail={user?.email || ''}
      />
      {/* ✅ /ADDED */}

    </div>
  );
};

export default Settings;
