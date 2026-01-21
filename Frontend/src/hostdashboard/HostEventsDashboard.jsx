import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getMyEvents, createHostEvent, updateHostEvent, deleteHostEvent, getHostDashboard } from "../api/host";
import { createEvent, updateEvent, deleteEvent, createEventWithFiles, updateEventWithFiles } from "../api/events";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import SimpleEventCard from "./SimpleEventCard";
import DetailedEventCard from "./DetailedEventCard";
import ParticipantsModal from "./ParticipantsModal";
import EventDetailsModal from "./EventDetailsModal";

const HostEventsDashboard = () => {
  // Add URLs for instant preview
  const [bannerUrl, setBannerUrl] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  // Dummy upload function (replace with real Firebase/Supabase upload)
  const uploadImage = async (file, type) => {
  // Legacy: just set preview, actual upload happens in createEventWithFiles
  return URL.createObjectURL(file);
  };
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostStats, setHostStats] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [error, setError] = useState(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState(null);
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState(null);

  // Form state for event creation/editing
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    location: '',
    venue: '',
    organizer: '',
    organizationName: '',
    category: '',
    maxParticipants: '',
    isPaid: false,
    fee: '',
    tags: '',
    requirements: '',
    contactEmail: user?.email || '',
    contactPhone: user?.phone || '',
    bannerImage: null,
    logoImage: null,
    socialLinks: {
      website: '',
      linkedin: ''
    }
  });

  // Helper function to get minimum date for form (current date + 1 day)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  };

  useEffect(() => {
    loadEvents();
    loadHostStats();
  }, []);

  const loadHostStats = async () => {
    try {
      const res = await getHostDashboard();
      setHostStats(res?.data || res || null);
    } catch {
      setHostStats(null);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try host-specific API first, then fallback to general events API
      let response;
      try {
        response = await getMyEvents();
  // getMyEvents response: (console.log removed)
      } catch (hostError) {
        // Fallback: try the general events API and filter by host
        try {
          const { listEvents } = await import('../api/events');
          const generalResponse = await listEvents();
          // General events response: (console.log removed)
          
          if (Array.isArray(generalResponse)) {
            // Filter events for current user
            const userEvents = generalResponse.filter(event => 
              event.hostUserId === user?.id || event.hostUserId === user?._id
            );
            response = userEvents;
            // Filtered user events: (console.log removed)
          } else {
            response = { success: false, error: hostError.message };
          }
        } catch (fallbackError) {
          response = { success: false, error: hostError.message };
        }
      }

      if (response && Array.isArray(response)) {
        // Backend returns events array directly
        setEvents(response);
  // Loaded events from API: (console.log removed)
      } else if (response.success && response.data) {
        // Handle wrapped response format
        setEvents(response.data.events || response.data || []);
      } else if (response && response.error) {
        setError(`Failed to load events: ${response.error}`);
        setEvents([]);
      } else {
        setEvents([]);
      }
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      const file = files[0];
      setEventForm(prev => ({ ...prev, [name]: file }));
      // Instant preview only
      if (name === 'bannerImage' && file) {
        setBannerUrl(URL.createObjectURL(file));
      }
      if (name === 'logoImage' && file) {
        setLogoUrl(URL.createObjectURL(file));
      }
    } else if (name.includes('.')) {
      // Handle nested objects like socialLinks.website
      const [parent, child] = name.split('.');
      setEventForm(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setEventForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setEventForm({
      title: '',
      description: '',
      date: '',
      location: '',
      venue: '',
      organizer: 'institution',
      organizationName: '',
      category: '',
      maxParticipants: '',
      isPaid: false,
      fee: '',
      tags: '',
      requirements: '',
      contactEmail: user?.email || '',
      contactPhone: user?.phone || '',
      bannerImage: null,
      logoImage: null,
      socialLinks: {
        website: '',
        linkedin: ''
      }
    });
    setBannerUrl(null);
    setLogoUrl(null);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Build organizer object from form state
      const organizer = {
        name: eventForm.organizationName || '', // required
        type: eventForm.organizer || 'institution', // required, default to institution
        contactEmail: eventForm.contactEmail || '',
        contactPhone: eventForm.contactPhone || ''
      };

      // Validate required organizer fields
      if (!organizer.name || !organizer.type) {
        alert('Organization name and type are required');
        setLoading(false);
        return;
      }

      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        type: eventForm.category, // Map category to type
        organizer,
        location: {
          type: eventForm.location,
          venue: eventForm.venue,
          eventLink: eventForm.eventLink || ''
        },
        capacity: eventForm.maxParticipants ? parseInt(eventForm.maxParticipants) : undefined,
        date: eventForm.date,
        isPaid: eventForm.isPaid,
        price: eventForm.isPaid ? parseFloat(eventForm.fee) : 0,
        tags: Array.isArray(eventForm.tags)
          ? eventForm.tags
          : typeof eventForm.tags === 'string'
            ? eventForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
            : [],
        requirements: eventForm.requirements
          ? eventForm.requirements.split('\n').map(r => r.trim()).filter(Boolean)
          : [],
        socialLinks: {
          website: eventForm.socialLinks?.website || '',
          linkedin: eventForm.socialLinks?.linkedin || ''
        },
        participants: typeof eventForm.participants === 'number'
          ? eventForm.participants
          : Array.isArray(eventForm.participants)
            ? eventForm.participants.length
            : eventForm.participants && typeof eventForm.participants === 'object'
              ? Object.keys(eventForm.participants).length
              : 0,
        bannerURL: bannerUrl || '',
        logoURL: logoUrl || '',
      };

  // Sending event data: (console.log removed)

      // Always use FormData for legacy backend
      const formData = new FormData();
      Object.keys(eventData).forEach(key => {
        const value = eventData[key];
        if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      if (eventForm.bannerImage instanceof File) {
        formData.append('banner', eventForm.bannerImage);
      }
      if (eventForm.logoImage instanceof File) {
        formData.append('logo', eventForm.logoImage);
      }
      const response = await createEventWithFiles(formData);

      if (response.success && response.event) { // Check for success response
        setShowCreateModal(false);
        resetForm();
        loadEvents(); // Reload events
        // Event created successfully
      } else {
        alert(response.error || 'Failed to create event');
      }
    } catch (err) {
      alert('Error creating event: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date ? new Date(event.date).toISOString().slice(0, 16) : '',
      location: event.location || '',
      venue: event.venue || '',
      category: event.category || '',
      maxParticipants: event.maxParticipants?.toString() || '',
      fee: event.fee?.toString() || '',
      tags: Array.isArray(event.tags) ? event.tags.join(', ') : '',
      requirements: Array.isArray(event.requirements) ? event.requirements.join('\n') : '',
      contactEmail: event.contactEmail || user?.email || '',
      contactPhone: event.contactPhone || '',
      coverImage: null,
      socialLinks: {
        website: event.socialLinks?.website || '',
        linkedin: event.socialLinks?.linkedin || ''
      }
    });
    setShowEditModal(true);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      setLoading(true);
      
      // Validate required fields
      if (!eventForm.title.trim()) {
        alert('Event title is required');
        setLoading(false);
        return;
      }
      
      if (!eventForm.date) {
        alert('Event date is required');
        setLoading(false);
        return;
      }
      
      // Validate that the start date is in the future (only for new events, allow editing past events)
      const startDate = new Date(eventForm.date);
      const now = new Date();
      if (startDate <= now && !editingEvent._id) {
        alert('Event start date must be in the future');
        setLoading(false);
        return;
      }
      
      // If end date is provided, validate it's after start date
      if (eventForm.endDate) {
        const endDate = new Date(eventForm.endDate);
        if (endDate <= startDate) {
          alert('End date must be after start date');
          setLoading(false);
          return;
        }
      }
      
      const eventData = {
        ...eventForm,
        schedule: {
          start: eventForm.date,
          end: eventForm.endDate || eventForm.date,
        },
        tags: eventForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        requirements: eventForm.requirements.split('\n').filter(req => req.trim()),
        maxParticipants: eventForm.maxParticipants ? parseInt(eventForm.maxParticipants) : undefined,
        fee: eventForm.fee ? parseFloat(eventForm.fee) : 0,
      };

      let response;
      if (eventForm.coverImage) {
        const formData = new FormData();
        Object.keys(eventData).forEach(key => {
          if (key === 'socialLinks') {
            formData.append('socialLinks', JSON.stringify(eventData[key]));
          } else if (key === 'tags' || key === 'requirements') {
            formData.append(key, JSON.stringify(eventData[key]));
          } else if (eventData[key] !== null && eventData[key] !== undefined) {
            formData.append(key, eventData[key]);
          }
        });
        formData.append('logo', eventForm.coverImage);
        response = await updateEventWithFiles(editingEvent._id, formData);
      } else {
        response = await updateEvent(editingEvent._id, eventData);
      }

      if (response.success) {
        setShowEditModal(false);
        setEditingEvent(null);
        resetForm();
        loadEvents();
        // Event updated successfully
      } else {
        alert(response.error || 'Failed to update event');
      }
    } catch (err) {
      alert('Error updating event: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await deleteEvent(eventId);
      
      if (response.success) {
        loadEvents();
        // Event deleted successfully
      } else {
        alert(response.error || 'Failed to delete event');
      }
    } catch (err) {
      alert('Error deleting event: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEvents = () => {
    let filtered = events;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab
    if (selectedTab !== "all") {
      filtered = filtered.filter(event => {
        switch (selectedTab) {
          case "active":
            return event.status === "published" || event.status === "active";
          case "draft":
            return event.status === "draft";
          case "past":
            return new Date(event.date) < new Date();
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const handleViewParticipants = (event) => {
    setSelectedEventForParticipants(event);
    setShowParticipantsModal(true);
  };

  const handleViewEventDetails = (event) => {
    setSelectedEventForDetails(event);
    setShowEventDetailsModal(true);
  };

  // Set global handler for event details (used by DetailedEventCard)
  useEffect(() => {
    window.__viewEventDetails = handleViewEventDetails;
    return () => {
      delete window.__viewEventDetails;
    };
  }, []);

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed sm:static top-0 left-0 h-full w-64 bg-gray-900 z-50 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 sm:translate-x-0`}>
        <HostSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Events Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">My Events</h1>
              <p className="text-gray-400 mt-1">Manage your hosted events</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="mt-4 sm:mt-0 bg-[#9b5de5] hover:bg-[#8c4be1] px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <span>+</span> Create Event
            </button>
          </div>

          {/* Host Dashboard Stats */}
          {hostStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-4">
                <p className="text-gray-400 text-sm">Total Events</p>
                <p className="text-2xl font-bold text-white">{hostStats.totalEvents || 0}</p>
              </div>
              <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-4">
                <p className="text-blue-300 text-sm">Total Registrations</p>
                <p className="text-2xl font-bold text-blue-200">{hostStats.totalRegistrations || 0}</p>
              </div>
              <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4">
                <p className="text-green-300 text-sm">Total Attended</p>
                <p className="text-2xl font-bold text-green-200">{hostStats.totalAttended || 0}</p>
              </div>
              <div className="bg-purple-900/30 border border-purple-700/40 rounded-xl p-4">
                <p className="text-purple-300 text-sm">Certificates Issued</p>
                <p className="text-2xl font-bold text-purple-200">{hostStats.totalCertificates || 0}</p>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-[#9b5de5] focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {["all", "active", "draft", "past"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors capitalize ${
                    selectedTab === tab
                      ? "bg-[#9b5de5] text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9b5de5]"></div>
              <span className="ml-3 text-gray-400">Loading events...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
              <button
                onClick={loadEvents}
                className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Events Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {getFilteredEvents().length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400 text-lg">No events found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {selectedTab === "all" ? "Create your first event to get started" : `No ${selectedTab} events found`}
                  </p>
                </div>
              ) : (
                getFilteredEvents().map((event) => {
                  // Defensive: ensure tags is always array
                  const safeTags = Array.isArray(event.tags)
                    ? event.tags
                    : typeof event.tags === 'string'
                      ? event.tags.split(',').map(t => t.trim()).filter(Boolean)
                      : [];
                  // Defensive: ensure participants is always a number
                  let safeParticipants = 0;
                  if (typeof event.participants === 'number') {
                    safeParticipants = event.participants;
                  } else if (Array.isArray(event.participants)) {
                    safeParticipants = event.participants.length;
                  } else if (event.participants && typeof event.participants === 'object') {
                    safeParticipants = Object.keys(event.participants).length;
                  }
                  // Defensive: ensure organizer is string or object
                  let safeOrganizer = event.organizer;
                  if (typeof event.organizer === 'object' && event.organizer !== null) {
                    safeOrganizer = event.organizer.name || JSON.stringify(event.organizer);
                  }
                  // Pass safe props to card
                  return (
                    <DetailedEventCard
                      key={event._id}
                      event={{
                        ...event,
                        tags: Array.isArray(safeTags) ? safeTags.join(', ') : safeTags,
                        participants: safeParticipants,
                        organizer: safeOrganizer
                      }}
                      onEdit={() => handleEditEvent(event)}
                      onDelete={() => handleDeleteEvent(event._id)}
                      onViewParticipants={handleViewParticipants}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Create New Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-purple-300 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto pr-2" style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#9b5de5 rgba(255,255,255,0.1)'
            }}>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={eventForm.description}
                    onChange={handleFormChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Organizer *</label>
                  <input
                    type="text"
                    name="organizer"
                    value={eventForm.organizer}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., Computer Science Club, Tech Society"
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Organization Name (Optional)</label>
                  <input
                    type="text"
                    name="organizationName"
                    value={eventForm.organizationName}
                    onChange={handleFormChange}
                    placeholder="e.g., Central University of Jharkhand, Tech Corp"
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <p className="text-xs text-purple-300/70 mt-1">If organizing on behalf of an organization, enter its name here. This will be displayed with the organization logo.</p>
                </div>

                {/* Date and Time */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Date *</label>
                  <input
                    type="datetime-local"
                    name="date"
                    value={eventForm.date}
                    onChange={handleFormChange}
                    min={getMinDate()}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Location Type *</label>
                    <select
                      name="location"
                      value={eventForm.location}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="" className="bg-gray-800">Select type</option>
                      <option value="online" className="bg-gray-800">Online</option>
                      <option value="offline" className="bg-gray-800">Offline</option>
                      <option value="hybrid" className="bg-gray-800">Hybrid</option>
                    </select>
                  </div>
                  {eventForm.location === 'offline' && (
                    <div>
                      <label className="block text-sm font-medium text-purple-300 mb-2">Venue *</label>
                      <input
                        type="text"
                        name="venue"
                        value={eventForm.venue}
                        onChange={handleFormChange}
                        required
                        placeholder="Venue name"
                        className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  )}
                  {eventForm.location === 'online' && (
                    <div>
                      <label className="block text-sm font-medium text-purple-300 mb-2">Event Link *</label>
                      <input
                        type="url"
                        name="eventLink"
                        value={eventForm.eventLink || ''}
                        onChange={handleFormChange}
                        required
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                  )}
                    {eventForm.location === 'hybrid' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-purple-300 mb-2">Venue *</label>
                          <input
                            type="text"
                            name="venue"
                            value={eventForm.venue}
                            onChange={handleFormChange}
                            required
                            placeholder="Venue name"
                            className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-purple-300 mb-2">Event Link *</label>
                          <input
                            type="url"
                            name="eventLink"
                            value={eventForm.eventLink || ''}
                            onChange={handleFormChange}
                            required
                            placeholder="https://..."
                            className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                      </>
                    )}
                </div>

                {/* Category and Participants */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Category</label>
                    <select
                      name="category"
                      value={eventForm.category}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="" className="bg-gray-800">Select category</option>
                      <option value="Technology" className="bg-gray-800">Technology</option>
                      <option value="Programming" className="bg-gray-800">Programming</option>
                      <option value="Cultural" className="bg-gray-800">Cultural</option>
                      <option value="Academic" className="bg-gray-800">Academic</option>
                      <option value="Sports" className="bg-gray-800">Sports</option>
                      <option value="Workshop" className="bg-gray-800">Workshop</option>
                      <option value="Seminar" className="bg-gray-800">Seminar</option>
                      <option value="Conference" className="bg-gray-800">Conference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Max Participants</label>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={eventForm.maxParticipants}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                {/* Event Type and Fee */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-3">Event Type</label>
                  <div className="flex items-center gap-6 mb-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="isPaid"
                        value="false"
                        checked={!eventForm.isPaid}
                        onChange={() => setEventForm(prev => ({ ...prev, isPaid: false, fee: '' }))}
                        className="mr-2 text-purple-500 focus:ring-purple-400"
                      />
                      <span className="text-white">Free Event</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="isPaid"
                        value="true"
                        checked={eventForm.isPaid}
                        onChange={() => setEventForm(prev => ({ ...prev, isPaid: true }))}
                        className="mr-2 text-purple-500 focus:ring-purple-400"
                      />
                      <span className="text-white">Paid Event</span>
                    </label>
                  </div>
                  {eventForm.isPaid && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-purple-300 mb-2">Registration Fee (₹) *</label>
                      <input
                        type="number"
                        name="fee"
                        value={eventForm.fee}
                        onChange={handleFormChange}
                        min="1"
                        step="0.01"
                        required={eventForm.isPaid}
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      {/* Payment Info Button (disabled until required fields are filled) */}
                      <button
                        type="button"
                        disabled={!eventForm.fee || !eventForm.title || !eventForm.date}
                        className="mt-2 w-full px-4 py-3 bg-purple-700/30 border border-purple-500/50 text-purple-300 rounded-lg font-medium disabled:opacity-50 hover:bg-purple-600/30 transition-colors"
                        onClick={() => alert('Payment info integration coming soon!')}
                      >
                        Add Payment Info
                      </button>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    name="tags"
                    value={eventForm.tags}
                    onChange={handleFormChange}
                    placeholder="e.g., Technology, AI, Innovation"
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Contact Email</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={eventForm.contactEmail}
                      readOnly
                      className="w-full px-4 py-3 bg-transparent border border-purple-500/50 rounded-lg text-purple-300 placeholder-purple-400 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Contact Phone</label>
                    <label htmlFor="organizer-type" className="block text-sm font-medium text-purple-300 mb-2">Organizer Type</label>
                    <select
                      id="organizer-type"
                      name="organizer"
                      value={eventForm.organizer}
                      onChange={handleFormChange}
                      required
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="club" className="bg-gray-800">Club</option>
                      <option value="institution" className="bg-gray-800">Institution</option>
                      <option value="person" className="bg-gray-800">Person</option>
                    </select>
                  </div>
                </div>

                {/* Organizer Info */}
                {/* Organizer Info (auto-filled, read-only) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Organizer Name</label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      readOnly
                      className="w-full px-4 py-3 bg-transparent border border-purple-500/50 rounded-lg text-purple-300 placeholder-purple-400 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Organizer Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-4 py-3 bg-transparent border border-purple-500/50 rounded-lg text-purple-300 placeholder-purple-400 focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Event Audience</label>
                  <select
                    name="audienceType"
                    value={eventForm.audienceType || ''}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="" className="bg-gray-800">Select audience</option>
                    <option value="institution" className="bg-gray-800">My Institution Only</option>
                    <option value="public" className="bg-gray-800">Public (Anyone can join)</option>
                  </select>
                </div>

                {/* Co-hosts */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Co-hosts (comma-separated emails)</label>
                  <input
                    type="text"
                    name="cohosts"
                    value={eventForm.cohosts || ''}
                    onChange={handleFormChange}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Sessions/Agenda */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Sessions/Agenda</label>
                  <textarea
                    name="sessions"
                    value={eventForm.sessions || ''}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="Session 1: Title, Speaker, Time\nSession 2: ..."
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>



                {/* Event Images */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Event Banner Image</label>
                    <p className="text-xs text-purple-300/70 mb-2">Upload a banner image for your event. This will be displayed as the main event banner.</p>
                    <input
                      type="file"
                      name="bannerImage"
                      onChange={handleFormChange}
                      accept="image/*"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600"
                    />
                    {(bannerUrl || eventForm.banner) && (
                      <div className="mt-2 w-full h-24 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-purple-500/30">
                        <img src={bannerUrl || eventForm.banner} alt="Banner Preview" className="object-cover w-full h-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Event Logo Image</label>
                    <p className="text-xs text-purple-300/70 mb-2">Upload a logo image for your event. This will be displayed as the event logo.</p>
                    <input
                      type="file"
                      name="logoImage"
                      onChange={handleFormChange}
                      accept="image/*"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600"
                    />
                    {(logoUrl || eventForm.logo) && (
                      <div className="mt-2 flex items-center justify-center">
                        <img src={logoUrl || eventForm.logo} alt="Logo Preview" className="object-cover w-16 h-16 rounded-full border-2 border-purple-500/50" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Requirements (one per line)</label>
                  <textarea
                    name="requirements"
                    value={eventForm.requirements}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="List any requirements or prerequisites"
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Website</label>
                    <input
                      type="url"
                      name="socialLinks.website"
                      value={eventForm.socialLinks.website}
                      onChange={handleFormChange}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">LinkedIn</label>
                    <input
                      type="url"
                      name="socialLinks.linkedin"
                      value={eventForm.socialLinks.linkedin}
                      onChange={handleFormChange}
                      placeholder="https://linkedin.com/in/event"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 border border-purple-500/50 text-purple-300 rounded-full font-medium transition-colors hover:bg-purple-900/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
          </div>
        </div>
      </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Edit Event</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-purple-300 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto pr-2">
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                {/* Organizer Type Dropdown */}
                <div>
                  <label htmlFor="organizer-type-edit" className="block text-sm font-medium text-purple-300 mb-2">Organizer Type</label>
                  <select
                    id="organizer-type-edit"
                    name="organizer"
                    value={eventForm.organizer}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="club" className="bg-gray-800">Club</option>
                    <option value="institution" className="bg-gray-800">Institution</option>
                    <option value="person" className="bg-gray-800">Person</option>
                  </select>
                </div>
                {/* Event Images */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Event Banner Image</label>
                    <input
                      type="file"
                      name="bannerImage"
                      onChange={handleFormChange}
                      accept="image/*"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600"
                    />
                    {(bannerUrl || eventForm.banner) && (
                      <div className="mt-2 w-full h-24 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-purple-500/30">
                        <img src={bannerUrl || eventForm.banner} alt="Banner Preview" className="object-cover w-full h-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Event Logo Image</label>
                    <input
                      type="file"
                      name="logoImage"
                      onChange={handleFormChange}
                      accept="image/*"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600"
                    />
                    {(logoUrl || eventForm.logo) && (
                      <div className="mt-2 flex items-center justify-center">
                        <img src={logoUrl || eventForm.logo} alt="Logo Preview" className="object-cover w-16 h-16 rounded-full border-2 border-purple-500/50" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Same form fields as create modal */}
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={eventForm.description}
                    onChange={handleFormChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Start Date *</label>
                    <input
                      type="datetime-local"
                      name="date"
                      value={eventForm.date}
                      onChange={handleFormChange}
                      min={getMinDate()}
                      required
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div>
                    {/* End Date field removed, and misplaced eventData object removed from JSX. Continue with category field. */}
                    <label className="block text-sm font-medium text-purple-300 mb-2">Category</label>
                    <select
                      name="category"
                      value={eventForm.category}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    >
                      <option value="" className="bg-gray-800">Select category</option>
                      <option value="Technology" className="bg-gray-800">Technology</option>
                      <option value="Programming" className="bg-gray-800">Programming</option>
                      <option value="Cultural" className="bg-gray-800">Cultural</option>
                      <option value="Academic" className="bg-gray-800">Academic</option>
                      <option value="Sports" className="bg-gray-800">Sports</option>
                      <option value="Workshop" className="bg-gray-800">Workshop</option>
                      <option value="Seminar" className="bg-gray-800">Seminar</option>
                      <option value="Conference" className="bg-gray-800">Conference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Max Participants</label>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={eventForm.maxParticipants}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 border border-purple-500/50 text-purple-300 rounded-full font-medium transition-colors hover:bg-purple-900/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedEventForParticipants && (
        <ParticipantsModal
          event={selectedEventForParticipants}
          onClose={() => {
            setShowParticipantsModal(false);
            setSelectedEventForParticipants(null);
          }}
        />
      )}

      {/* Event Details Modal */}
      {showEventDetailsModal && selectedEventForDetails && (
        <EventDetailsModal
          event={selectedEventForDetails}
          onClose={() => {
            setShowEventDetailsModal(false);
            setSelectedEventForDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default HostEventsDashboard;
