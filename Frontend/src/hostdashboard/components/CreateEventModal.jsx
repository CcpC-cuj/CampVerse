import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { createEventWithFiles } from "../../api/events";

const CreateEventModal = ({ isOpen, onClose, onEventCreated }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
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
        onClose();
        resetForm();
        onEventCreated();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Create New Event</h3>
          <button
            onClick={onClose}
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
                onClick={onClose}
                className="px-6 py-3 border border-purple-500/50 text-purple-300 rounded-full font-medium transition-colors hover:bg-purple-900/30"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEventModal;