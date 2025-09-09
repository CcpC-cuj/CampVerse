import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getMyEvents } from "../api/host";
import { createEventWithFiles } from "../api/events";
import HostSidebar from "./HostSidebar";
import HostNavBar from "./HostNavBar";
import EnhancedHostEventCard from "./EnhancedHostEventCard";

const ManageEvents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Form state for event creation
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
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
    },
    audienceType: '',
    cohosts: '',
    sessions: '',
    eventLink: ''
  });
  
  // Image preview URLs
  const [bannerUrl, setBannerUrl] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    const loadEventsData = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading host events data...");

        // Load events
        let eventsData = [];
        try {
          eventsData = await getMyEvents();
          console.log("Events data:", eventsData);
          
          if (Array.isArray(eventsData)) {
            eventsData = eventsData;
          } else if (eventsData && eventsData.events) {
            eventsData = eventsData.events;
          } else {
            eventsData = [];
          }
        } catch (eventsError) {
          console.error("Events API failed:", eventsError);
          // Check if it's a 403 or role-related error
          if (eventsError.message?.includes('403') || eventsError.message?.includes('Forbidden')) {
            setError("You don't have host permissions. Please complete your host registration first.");
          } else {
            setError("Failed to load events. Please try again.");
          }
          eventsData = [];
        }

        if (!mounted) return;

        // Transform events data for display
        const transformedEvents = eventsData.map(event => ({
          ...event,
          id: event._id,
          title: event.title,
          date: event.schedule?.start || event.createdAt,
          status: getEventStatus(event),
          registrations: event.participants?.length || 0,
          cover: event.logoURL || event.bannerURL || "/placeholder-event.jpg",
          verificationStatus: event.verificationStatus,
          category: event.type || 'Uncategorized',
          participants: event.participants || [],
          venue: event.venue || "Location TBD",
          maxRegistrations: event.maxParticipants || 100,
          tags: Array.isArray(event.tags) ? event.tags : (event.tags ? [event.tags] : []),
          description: event.description || "No description available"
        }));

        setEvents(transformedEvents);
        
      } catch (error) {
        console.error("Error loading events:", error);
        setError("Failed to load events data");
        
        // Set empty state
        if (mounted) {
          setEvents([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadEventsData();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Helper function to get minimum date for form (current date + 1 day)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
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
      endDate: '',
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
      },
      audienceType: '',
      cohosts: '',
      sessions: '',
      eventLink: ''
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
        name: eventForm.organizationName || '',
        type: eventForm.organizer || 'institution',
        contactEmail: eventForm.contactEmail || '',
        contactPhone: eventForm.contactPhone || ''
      };

      // Validate required organizer fields
      if (!organizer.name || !organizer.type) {
        alert('Organizer name and type are required');
        setLoading(false);
        return;
      }

      const eventData = {
        title: eventForm.title,
        description: eventForm.description,
        type: eventForm.category,
        organizer,
        location: {
          type: eventForm.location,
          venue: eventForm.venue,
          eventLink: eventForm.eventLink || ''
        },
        capacity: eventForm.maxParticipants ? parseInt(eventForm.maxParticipants) : undefined,
        date: eventForm.date,
        endDate: eventForm.endDate || eventForm.date,
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
        participants: 0,
        bannerURL: bannerUrl || '',
        logoURL: logoUrl || '',
      };

      console.log('Sending event data:', eventData);

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

      if (response.success && response.event) {
        setShowCreateModal(false);
        resetForm();
        // Reload the page to refresh events
        window.location.reload();
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
  // Helper function to determine event status
  const getEventStatus = (event) => {
    if (event.verificationStatus === 'pending') return 'draft';
    if (event.verificationStatus === 'rejected') return 'rejected';
    
    const now = new Date();
    const eventDate = new Date(event.schedule?.start || event.createdAt);
    
    if (eventDate > now) return 'upcoming';
    if (eventDate < now) return 'past';
    return 'active';
  };

  // Filter events based on search and tab
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedTab === "all") return matchesSearch;
    if (selectedTab === "active") return matchesSearch && (event.status === "active" || event.status === "upcoming");
    if (selectedTab === "upcoming") return matchesSearch && event.status === "upcoming";
    if (selectedTab === "draft") return matchesSearch && event.status === "draft";
    if (selectedTab === "past") return matchesSearch && event.status === "past";
    
    return matchesSearch;
  });

  const statsCalculated = {
    total: events.length,
    active: events.filter(e => e.status === "active" || e.status === "upcoming").length,
    upcoming: events.filter(e => e.status === "upcoming").length,
    draft: events.filter(e => e.status === "draft").length,
    past: events.filter(e => e.status === "past").length
  };

  // Event handlers for HostEventCard
  const handleEditEvent = (event) => {
    console.log("Edit event:", event);
    // Navigate to edit event page or open edit modal
    navigate(`/host/events-new?edit=${event._id}`);
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        // Add delete API call here
        console.log("Delete event:", eventId);
        // Refresh events after deletion
        window.location.reload();
      } catch (error) {
        console.error("Error deleting event:", error);
        alert("Failed to delete event. Please try again.");
      }
    }
  };

  const handleViewParticipants = (event) => {
    console.log("View participants for event:", event);
    // Open participants modal or navigate to participants view
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-3xl text-[#9b5de5]" />
          <p className="text-gray-300">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#141a45] text-white">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <i className="ri-error-warning-line text-4xl text-red-400" />
          <h2 className="text-xl font-semibold">Error Loading Events</h2>
          <p className="text-gray-300">{error}</p>
          <div className="flex gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg font-medium transition-all"
            >
              Try Again
            </button>
            {error.includes('host permissions') && (
              <button 
                onClick={() => navigate('/host/registration')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                Complete Host Registration
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col sm:flex-row bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white font-poppins">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed sm:static top-0 left-0 h-full w-64 bg-[#0b0f2b] z-50 transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } transition-transform duration-300 sm:translate-x-0 border-r border-gray-800`}
      >
        <HostSidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#141a45]">
        <HostNavBar
          onOpenSidebar={() => setSidebarOpen(true)}
          eventsData={events}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ textShadow: "0 0 8px rgba(155, 93, 229, 0.35)" }}>
                Manage Events
              </h1>
              <p className="text-gray-300 mt-1">
                Create, manage, and track all your events
              </p>
            </div>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium transition-all hover:shadow-[0_0_15px_rgba(155,93,229,0.35)]"
            >
              <i className="ri-add-line text-lg"></i>
              Create New Event
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Events", count: statsCalculated.total, icon: "ri-calendar-line", color: "bg-[#9b5de5]/20 text-[#d9c4ff]" },
              { label: "Active", count: statsCalculated.active, icon: "ri-play-circle-line", color: "bg-green-500/20 text-green-400" },
              { label: "Upcoming", count: statsCalculated.upcoming, icon: "ri-time-line", color: "bg-blue-500/20 text-blue-400" },
              { label: "Drafts", count: statsCalculated.draft, icon: "ri-draft-line", color: "bg-yellow-500/20 text-yellow-400" },
              { label: "Past", count: statsCalculated.past, icon: "ri-history-line", color: "bg-gray-500/20 text-gray-400" }
            ].map((stat, index) => (
              <div key={index} className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/40 hover:border-[#9b5de5]/30 transition-all">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                  <i className={`${stat.icon} text-lg`}></i>
                </div>
                <div className="text-sm text-gray-400">{stat.label}</div>
                <div className="text-xl font-bold">{stat.count}</div>
              </div>
            ))}
          </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {[
                  { id: "all", label: "All Events", count: statsCalculated.total },
                  { id: "active", label: "Active", count: statsCalculated.active },
                  { id: "upcoming", label: "Upcoming", count: statsCalculated.upcoming },
                  { id: "draft", label: "Drafts", count: statsCalculated.draft },
                  { id: "past", label: "Past", count: statsCalculated.past }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedTab === tab.id
                        ? "bg-[#9b5de5] text-white"
                        : "bg-gray-800/60 text-gray-300 hover:bg-gray-800/80"
                    }`}
                  >
                    {tab.label}
                    <span className="bg-gray-700/60 text-xs px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Events Grid */}
              {filteredEvents.length === 0 ? (
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-700/60 flex items-center justify-center mx-auto mb-4">
                    <i className="ri-calendar-line text-2xl text-gray-400"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No events found</h3>
                  <p className="text-gray-400 mb-6">
                    {searchQuery ? "Try adjusting your search terms" : "Start by creating your first event"}
                  </p>
                  <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#9b5de5] hover:bg-[#8c4be1] text-white px-6 py-3 rounded-lg font-medium transition-all"
                  >
                    Create Your First Event
                  </button>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEvents.map((event) => (
                    <EnhancedHostEventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEditEvent}
                      onDelete={handleDeleteEvent}
                      onViewParticipants={handleViewParticipants}
                    />
                  ))}
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
                  <label className="block text-sm font-medium text-purple-300 mb-2">Organization Name *</label>
                  <input
                    type="text"
                    name="organizationName"
                    value={eventForm.organizationName}
                    onChange={handleFormChange}
                    required
                    placeholder="e.g., Central University of Jharkhand, Tech Corp"
                    className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
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
                    {bannerUrl && (
                      <div className="mt-2 w-full h-24 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-purple-500/30">
                        <img src={bannerUrl} alt="Banner Preview" className="object-cover w-full h-full" />
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
                    {logoUrl && (
                      <div className="mt-2 flex items-center justify-center">
                        <img src={logoUrl} alt="Logo Preview" className="object-cover w-16 h-16 rounded-full border-2 border-purple-500/50" />
                      </div>
                    )}
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
    </div>
  );
};

export default ManageEvents;