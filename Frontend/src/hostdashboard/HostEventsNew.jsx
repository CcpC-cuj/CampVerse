import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getMyEvents, createHostEvent, updateHostEvent, deleteHostEvent } from "../api/host";
import { createEvent, updateEvent, deleteEvent, createEventWithFiles, updateEventWithFiles } from "../api/events";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import HostEventCard from "./HostEventCard";

const HostEvents = () => {
  // Add URLs for instant preview
  const [bannerUrl, setBannerUrl] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  // Dummy upload function (replace with real Firebase/Supabase upload)
  const uploadImage = async (file, type) => {
    // TODO: Replace with actual upload logic
    // Simulate upload and return a local preview URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });
  };
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [error, setError] = useState(null);

  // Form state for event creation/editing
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    venue: '',
    category: '',
    maxParticipants: '',
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
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try host-specific API first, then fallback to general events API
      let response;
      try {
        response = await getMyEvents();
        console.log('getMyEvents response:', response);
      } catch (hostError) {
        console.error('Host API failed:', hostError);
        // Fallback: try the general events API and filter by host
        try {
          const { listEvents } = await import('../api/events');
          const generalResponse = await listEvents();
          console.log('General events response:', generalResponse);
          
          if (Array.isArray(generalResponse)) {
            // Filter events for current user
            const userEvents = generalResponse.filter(event => 
              event.hostUserId === user?.id || event.hostUserId === user?._id
            );
            response = userEvents;
            console.log('Filtered user events:', userEvents);
          } else {
            response = { success: false, error: hostError.message };
          }
        } catch (fallbackError) {
          console.error('Fallback API also failed:', fallbackError);
          response = { success: false, error: hostError.message };
        }
      }

      if (response && Array.isArray(response)) {
        // Backend returns events array directly
        setEvents(response);
        console.log('Loaded events from API:', response);
      } else if (response.success && response.data) {
        // Handle wrapped response format
        setEvents(response.data.events || response.data || []);
      } else if (response && response.error) {
        console.error('API Error:', response.error);
        setError(`Failed to load events: ${response.error}`);
        setEvents([]);
      } else {
        // Mock data for demonstration when API is not working
        setEvents([
          {
            _id: "mock_1",
            title: "Annual Tech Symposium 2025",
            description: "A comprehensive technology symposium featuring the latest innovations in AI, blockchain, and cloud computing. Join industry leaders for keynotes, workshops, and networking opportunities.",
            date: "2025-09-15T09:00:00Z",
            endDate: "2025-09-15T17:00:00Z",
            status: "published",
            participants: 312,
            maxParticipants: 500,
            location: "offline",
            venue: "Memorial Auditorium, CUJ Campus",
            category: "Technology",
            fee: 1500,
            tags: ["Technology", "Innovation", "Networking", "AI"],
            coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            host: { name: user?.name || "You", organization: "CUJ" },
            contactEmail: user?.email,
            registrationDeadline: "2025-09-10T23:59:00Z"
          },
          {
            _id: "mock_2", 
            title: "Summer Hackathon 2025",
            description: "48-hour coding marathon for innovative solutions. Build, innovate, and compete for amazing prizes. Open to all skill levels.",
            date: "2025-09-22T10:00:00Z",
            endDate: "2025-09-24T10:00:00Z",
            status: "draft",
            participants: 156,
            maxParticipants: 200,
            location: "offline",
            venue: "Engineering Block, CUJ",
            category: "Programming",
            fee: 0,
            tags: ["Programming", "Innovation", "Competition", "Hackathon"],
            coverImage: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
            host: { name: user?.name || "You", organization: "CUJ" },
            contactEmail: user?.email,
            registrationDeadline: "2025-09-20T23:59:00Z"
          },
          {
            _id: "mock_3",
            title: "International Cultural Festival",
            description: "Celebrating diversity and cultural exchange through music, dance, art, and food from around the world.",
            date: "2025-10-05T11:00:00Z", 
            endDate: "2025-10-07T20:00:00Z",
            status: "published",
            participants: 789,
            maxParticipants: 1000,
            location: "offline",
            venue: "Central Lawn, CUJ Campus",
            category: "Cultural",
            fee: 500,
            tags: ["Cultural", "International", "Festival", "Music", "Dance"],
            coverImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
            host: { name: user?.name || "You", organization: "CUJ" },
            contactEmail: user?.email,
            registrationDeadline: "2025-10-01T23:59:00Z"
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading events:', err);
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
      // Instant upload and preview
      if (name === 'bannerImage' && file) {
        uploadImage(file, 'banner').then(url => setBannerUrl(url));
      }
      if (name === 'logoImage' && file) {
        uploadImage(file, 'logo').then(url => setLogoUrl(url));
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
      endDate: '',
      location: '',
      venue: '',
      category: '',
      maxParticipants: '',
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
      
      // Validate required fields
      if (!eventForm.title.trim()) {
        alert('Event title is required');
        setLoading(false);
        return;
      }
      
      if (!eventForm.date) {
        alert('Event start date is required');
        setLoading(false);
        return;
      }
      
      // Validate that the start date is in the future
      const startDate = new Date(eventForm.date);
      const now = new Date();
      if (startDate <= now) {
        alert('Event start date must be in the future');
        setLoading(false);
        return;
      }
      
      // If end date is provided, validate it's after start date
      if (eventForm.endDate) {
        const endDate = new Date(eventForm.endDate);
        if (endDate <= startDate) {
          alert('Event end date must be after start date');
          setLoading(false);
          return;
        }
      }
      
      // Map frontend fields to backend Event model fields
      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        type: eventForm.category, // Map category to type
        organizer: eventForm.organizer || 'Event Organizer', // Use dedicated organizer field
        location: {
          type: eventForm.location,
          venue: eventForm.venue
        },
        schedule: {
          start: eventForm.date,
          end: eventForm.endDate || eventForm.date, // If no end date, use start date
        },
        isPaid: eventForm.fee && parseFloat(eventForm.fee) > 0,
        price: eventForm.fee ? parseFloat(eventForm.fee) : 0,
        tags: eventForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        // Note: requirements, contactEmail, contactPhone are not in the Event model
        // You may want to add them to the model or store them differently
      };

      console.log('Sending event data:', eventData);

      let response;
      if (eventForm.bannerImage || eventForm.logoImage) {
        // Create FormData for file upload
        const formData = new FormData();
        Object.keys(eventData).forEach(key => {
          if (key === 'schedule') {
            formData.append('schedule', JSON.stringify(eventData[key]));
          } else if (key === 'tags') {
            formData.append(key, JSON.stringify(eventData[key]));
          } else if (eventData[key] !== null && eventData[key] !== undefined) {
            formData.append(key, eventData[key]);
          }
        });
        // Use 'banner' and 'logo' as field names for backend compatibility
        if (eventForm.bannerImage) formData.append('banner', eventForm.bannerImage);
        if (eventForm.logoImage) formData.append('logo', eventForm.logoImage);
        response = await createEventWithFiles(formData);
      } else {
        response = await createEvent(eventData);
      }

      if (response._id && !response.error) { // Check if we got an event object back (has _id) and no error
        setShowCreateModal(false);
        resetForm();
        loadEvents(); // Reload events
        alert('Event created successfully!');
      } else {
        console.error('Create event response:', response);
        alert(response.error || response.message || 'Failed to create event');
      }
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event: ' + err.message);
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
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
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
        alert('Event start date is required');
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
          alert('Event end date must be after start date');
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
        alert('Event updated successfully!');
      } else {
        alert(response.message || 'Failed to update event');
      }
    } catch (err) {
      console.error('Error updating event:', err);
      alert('Failed to update event: ' + err.message);
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
        alert('Event deleted successfully!');
      } else {
        alert(response.message || 'Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event: ' + err.message);
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
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {getFilteredEvents().length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-400 text-lg">No events found</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {selectedTab === "all" ? "Create your first event to get started" : `No ${selectedTab} events found`}
                  </p>
                </div>
              ) : (
                getFilteredEvents().map((event) => (
                  <HostEventCard
                    key={event._id}
                    event={event}
                    onEdit={() => handleEditEvent(event)}
                    onDelete={() => handleDeleteEvent(event._id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Create New Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleCreateEvent} className="space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium mb-2">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={eventForm.description}
                    onChange={handleFormChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date *</label>
                    <input
                      type="datetime-local"
                      name="date"
                      value={eventForm.date}
                      onChange={handleFormChange}
                      min={getMinDate()}
                      required
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={eventForm.endDate}
                      onChange={handleFormChange}
                      min={eventForm.date || getMinDate()}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Location Type *</label>
                    <select
                      name="location"
                      value={eventForm.location}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    >
                      <option value="">Select type</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue</label>
                    <input
                      type="text"
                      name="venue"
                      value={eventForm.venue}
                      onChange={handleFormChange}
                      placeholder="Venue name or online platform"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Category and Participants */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      name="category"
                      value={eventForm.category}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    >
                      <option value="">Select category</option>
                      <option value="Technology">Technology</option>
                      <option value="Programming">Programming</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Academic">Academic</option>
                      <option value="Sports">Sports</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Seminar">Seminar</option>
                      <option value="Conference">Conference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Participants</label>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={eventForm.maxParticipants}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Fee and Tags */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Registration Fee (₹)</label>
                    <input
                      type="number"
                      name="fee"
                      value={eventForm.fee}
                      onChange={handleFormChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      name="tags"
                      value={eventForm.tags}
                      onChange={handleFormChange}
                      placeholder="e.g., Technology, AI, Innovation"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Email</label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={eventForm.contactEmail}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contact Phone</label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={eventForm.contactPhone}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Event Image */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Event Banner Image</label>
                    <p className="text-xs text-gray-400 mb-2">Upload a banner image for your event. This will be displayed as the main event banner.</p>
                    <input
                      type="file"
                      name="bannerImage"
                      onChange={handleFormChange}
                      accept="image/*"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                    {bannerUrl && (
                      <div className="mt-2 w-full h-24 bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden border border-gray-700">
                        <img src={bannerUrl} alt="Banner Preview" className="object-cover w-full h-full" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Event Logo Image</label>
                    <p className="text-xs text-gray-400 mb-2">Upload a logo image for your event. This will be displayed as the event logo.</p>
                    <input
                      type="file"
                      name="logoImage"
                      onChange={handleFormChange}
                      accept="image/*"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                    {logoUrl && (
                      <div className="mt-2 flex items-center justify-center">
                        <img src={logoUrl} alt="Logo Preview" className="object-cover w-16 h-16 rounded-full border-2 border-gray-700" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium mb-2">Requirements (one per line)</label>
                  <textarea
                    name="requirements"
                    value={eventForm.requirements}
                    onChange={handleFormChange}
                    rows={3}
                    placeholder="List any requirements or prerequisites"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                  />
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Website</label>
                    <input
                      type="url"
                      name="socialLinks.website"
                      value={eventForm.socialLinks.website}
                      onChange={handleFormChange}
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">LinkedIn</label>
                    <input
                      type="url"
                      name="socialLinks.linkedin"
                      value={eventForm.socialLinks.linkedin}
                      onChange={handleFormChange}
                      placeholder="https://linkedin.com/in/event"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit Event</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                {/* Same form fields as create modal */}
                <div>
                  <label className="block text-sm font-medium mb-2">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={eventForm.title}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={eventForm.description}
                    onChange={handleFormChange}
                    required
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date *</label>
                    <input
                      type="datetime-local"
                      name="date"
                      value={eventForm.date}
                      onChange={handleFormChange}
                      min={getMinDate()}
                      required
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={eventForm.endDate}
                      onChange={handleFormChange}
                      min={eventForm.date || getMinDate()}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Location Type *</label>
                    <select
                      name="location"
                      value={eventForm.location}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    >
                      <option value="">Select type</option>
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Venue</label>
                    <input
                      type="text"
                      name="venue"
                      value={eventForm.venue}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      name="category"
                      value={eventForm.category}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    >
                      <option value="">Select category</option>
                      <option value="Technology">Technology</option>
                      <option value="Programming">Programming</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Academic">Academic</option>
                      <option value="Sports">Sports</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Seminar">Seminar</option>
                      <option value="Conference">Conference</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Max Participants</label>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={eventForm.maxParticipants}
                      onChange={handleFormChange}
                      min="1"
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-[#9b5de5] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#9b5de5] hover:bg-[#8c4be1] px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Event'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostEvents;
