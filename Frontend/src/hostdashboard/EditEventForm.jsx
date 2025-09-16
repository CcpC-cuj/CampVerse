import React, { useState, useEffect } from "react";

const EditEventForm = ({ event, onSave, onCancel, loading }) => {
  console.log('EditEventForm received event:', event);
  const [eventForm, setEventForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date ? (() => {
      const eventDate = new Date(event.date);
      // Add 5.5 hours to convert UTC to IST for display
      eventDate.setHours(eventDate.getHours() + 5);
      eventDate.setMinutes(eventDate.getMinutes() + 30);
      return eventDate.toISOString().slice(0, 16);
    })() : '',
    location: (() => {
      if (typeof event?.location === 'string') {
        try {
          const parsed = JSON.parse(event.location);
          return parsed.type || parsed || '';
        } catch {
          // For simple strings like '"offline"', clean and return
          return event.location.replace(/"/g, '') || '';
        }
      }
      return event?.location?.type || '';
    })(),
    venue: (() => {
      if (typeof event?.location === 'string') {
        try {
          const parsed = JSON.parse(event.location);
          return parsed.venue || '';
        } catch {
          // If location is just a type string, venue should be empty
          return '';
        }
      }
      return event?.location?.venue || '';
    })(),
    eventLink: (() => {
      if (typeof event?.location === 'string') {
        try {
          const parsed = JSON.parse(event.location);
          return parsed.eventLink || '';
        } catch {
          return '';
        }
      }
      return event?.location?.eventLink || '';
    })(),
    organizer: (() => {
      if (typeof event?.organizer === 'string') {
        try {
          const parsed = JSON.parse(event.organizer);
          return parsed.name || parsed || '';
        } catch {
          return event.organizer.replace(/"/g, '') || '';
        }
      }
      return event?.organizer?.name || '';
    })(),
    organizerType: (() => {
      if (typeof event?.organizer === 'string') {
        try {
          const parsed = JSON.parse(event.organizer);
          return parsed.type || '';
        } catch {
          // For simple strings like '"CCPC-CUJ"', default to 'club' if it looks like an organization
          const cleanName = event.organizer.replace(/"/g, '');
          if (cleanName && cleanName.length > 0) {
            return 'club'; // Default assumption for organization names
          }
          return '';
        }
      }
      return event?.organizer?.type || '';
    })(),
    organizationName: event?.organizationName || '',
    category: event?.type || '',
    maxParticipants: event?.capacity?.toString() || '',
    isPaid: event?.isPaid || false,
    fee: event?.price?.toString() || '',
    tags: Array.isArray(event?.tags) ? event.tags.join(', ') : event?.tags || '',
    requirements: Array.isArray(event?.requirements) ? event.requirements.join('\n') : event?.requirements || '',
    contactEmail: event?.contactEmail || '',
    contactPhone: event?.contactPhone || '',
    bannerImage: null,
    logoImage: null,
    socialLinks: (() => {
      try {
        if (typeof event?.socialLinks === 'string') {
          return JSON.parse(event.socialLinks);
        }
        if (event?.socialLinks && typeof event.socialLinks === 'object') {
          return {
            website: event.socialLinks.website || '',
            linkedin: event.socialLinks.linkedin || ''
          };
        }
      } catch (e) {
        console.warn('Error parsing socialLinks:', e);
      }
      return { website: '', linkedin: '' };
    })(),
    audienceType: event?.audienceType || '',
    cohosts: Array.isArray(event?.coHosts) ? event.coHosts : [],
    sessions: Array.isArray(event?.sessions) ? event.sessions.join('\n') : (event?.sessions || ''),
    certificateEnabled: event?.features?.certificateEnabled || false,
    chatEnabled: event?.features?.chatEnabled || false,
  });
  const [bannerUrl, setBannerUrl] = useState(event?.bannerURL || null);
  const [logoUrl, setLogoUrl] = useState(event?.logoURL || null);
  const [cohostInput, setCohostInput] = useState('');

  useEffect(() => {
    if (event) {
      console.log('Event data in useEffect:', event);
      

      // Update form with fresh event data
      setEventForm(prev => ({
        ...prev,
        title: event?.title || '',
        description: event?.description || '',
        date: event?.date ? (() => {
          const eventDate = new Date(event.date);
          eventDate.setHours(eventDate.getHours() + 5);
          eventDate.setMinutes(eventDate.getMinutes() + 30);
          return eventDate.toISOString().slice(0, 16);
        })() : '',
        location: (() => {
          if (typeof event?.location === 'string') {
            return event.location.replace(/"/g, '') || '';
          }
          return event?.location?.type || '';
        })(),
        venue: (() => {
          if (typeof event?.location === 'string') {
            try {
              const parsed = JSON.parse(event.location);
              return parsed.venue || '';
            } catch {
              return '';
            }
          }
          return event?.location?.venue || '';
        })(),
        organizer: (() => {
          if (typeof event?.organizer === 'string') {
            return event.organizer.replace(/"/g, '') || '';
          }
          return event?.organizer?.name || '';
        })(),
        organizerType: (() => {
          if (typeof event?.organizer === 'string') {
            try {
              const parsed = JSON.parse(event.organizer);
              return parsed.type || '';
            } catch {
              const cleanName = event.organizer.replace(/"/g, '');
              return cleanName && cleanName.length > 0 ? 'club' : '';
            }
          }
          return event?.organizer?.type || '';
        })(),
        organizationName: event?.organizationName || '',
        category: event?.type || '',
        maxParticipants: event?.capacity?.toString() || '',
        isPaid: event?.isPaid || false,
        fee: event?.price?.toString() || '',
        tags: Array.isArray(event?.tags) ? event.tags.join(', ') : event?.tags || '',
        requirements: Array.isArray(event?.requirements) ? event.requirements.join('\n') : event?.requirements || '',
        audienceType: event?.audienceType || '',
        cohosts: Array.isArray(event?.coHosts) ? event.coHosts : [],
        sessions: Array.isArray(event?.sessions) ? event.sessions.join('\n') : (event?.sessions || ''),
        certificateEnabled: event?.features?.certificateEnabled || false,
        chatEnabled: event?.features?.chatEnabled || false,
        socialLinks: (() => {
          try {
            if (typeof event?.socialLinks === 'string') {
              return JSON.parse(event.socialLinks);
            }
            if (event?.socialLinks && typeof event.socialLinks === 'object') {
              return {
                website: event.socialLinks.website || '',
                linkedin: event.socialLinks.linkedin || ''
              };
            }
          } catch (e) {
            console.warn('Error parsing socialLinks:', e);
          }
          return { website: '', linkedin: '' };
        })(),
      }));
      
      if (event?.bannerURL) setBannerUrl(event.bannerURL);
      if (event?.logoURL) setLogoUrl(event.logoURL);
    }
  }, [event]);

  const handleFormChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      setEventForm(prev => ({ ...prev, [name]: file }));
      if (name === 'bannerImage' && file) setBannerUrl(URL.createObjectURL(file));
      if (name === 'logoImage' && file) setLogoUrl(URL.createObjectURL(file));
    } else if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setEventForm(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      if (name === 'cohostInput') {
        setCohostInput(value);
      } else {
        setEventForm(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleAddCohost = () => {
    const email = cohostInput.trim();
    if (email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEventForm(prev => ({
        ...prev,
        cohosts: [...prev.cohosts, email]
      }));
      setCohostInput('');
    }
  };

  const handleRemoveCohost = (idx) => {
    setEventForm(prev => ({
      ...prev,
      cohosts: prev.cohosts.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert IST time back to UTC for storage
    const formDataWithUTC = { 
      ...eventForm,
      features: {
        certificateEnabled: eventForm.certificateEnabled || false,
        chatEnabled: eventForm.chatEnabled || false
      }
    };
    if (formDataWithUTC.date) {
      const istDate = new Date(formDataWithUTC.date);
      // Subtract 5.5 hours to convert IST to UTC
      istDate.setHours(istDate.getHours() - 5);
      istDate.setMinutes(istDate.getMinutes() - 30);
      formDataWithUTC.date = istDate.toISOString();
    }
    
    if (onSave) onSave(formDataWithUTC, bannerUrl, logoUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-3xl p-8 bg-[rgba(21,23,41,0.85)] border border-purple-600 backdrop-blur-lg rounded-2xl shadow-xl overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Edit Event</h3>
          {onCancel && (
            <button onClick={onCancel} className="text-purple-300 hover:text-white text-2xl transition-colors">×</button>
          )}
        </div>
        <div className="max-h-[75vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#9b5de5 rgba(255,255,255,0.1)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Event Title *</label>
              <input type="text" name="title" value={eventForm.title} onChange={handleFormChange} required className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Description *</label>
              <textarea name="description" value={eventForm.description} onChange={handleFormChange} required rows={4} className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            {/* Organizer Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Organizer Type *</label>
              <select name="organizerType" value={eventForm.organizerType || ''} onChange={handleFormChange} required className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="" className="bg-gray-800">Select type</option>
                <option value="institution" className="bg-gray-800">Institution</option>
                <option value="club" className="bg-gray-800">Club</option>
                <option value="company" className="bg-gray-800">Company</option>
                <option value="individual" className="bg-gray-800">Individual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Organizer Name *</label>
              <input type="text" name="organizer" value={eventForm.organizer} onChange={handleFormChange} required placeholder="e.g., Computer Science Club, Tech Society" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Organization Name (Optional)</label>
              <input type="text" name="organizationName" value={eventForm.organizationName} onChange={handleFormChange} placeholder="e.g., Central University of Jharkhand, Tech Corp" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
              <p className="text-xs text-purple-300/70 mt-1">If organizing on behalf of an organization, enter its name here. This will be displayed with the organization logo.</p>
            </div>
            {/* Date and Time */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Date *</label>
              <input type="datetime-local" name="date" value={eventForm.date} onChange={handleFormChange} required className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Location Type *</label>
                <select name="location" value={eventForm.location} onChange={handleFormChange} required className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="" className="bg-gray-800">Select type</option>
                  <option value="online" className="bg-gray-800">Online</option>
                  <option value="offline" className="bg-gray-800">Offline</option>
                  <option value="hybrid" className="bg-gray-800">Hybrid</option>
                </select>
              </div>
              {eventForm.location === 'offline' && (
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Venue *</label>
                  <input type="text" name="venue" value={eventForm.venue} onChange={handleFormChange} required placeholder="Venue name" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              )}
              {eventForm.location === 'online' && (
                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Event Link *</label>
                  <input type="url" name="eventLink" value={eventForm.eventLink || ''} onChange={handleFormChange} required placeholder="https://..." className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              )}
              {eventForm.location === 'hybrid' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Venue *</label>
                    <input type="text" name="venue" value={eventForm.venue} onChange={handleFormChange} required placeholder="Venue name" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-purple-300 mb-2">Event Link *</label>
                    <input type="url" name="eventLink" value={eventForm.eventLink || ''} onChange={handleFormChange} required placeholder="https://..." className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  </div>
                </>
              )}
            </div>
            {/* Category and Participants */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Category</label>
                <select name="category" value={eventForm.category} onChange={handleFormChange} className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400">
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
                <input type="number" name="maxParticipants" value={eventForm.maxParticipants} onChange={handleFormChange} min="1" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            </div>
            {/* Event Type and Fee */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-3">Event Type</label>
              <div className="flex items-center gap-6 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="isPaid" value="false" checked={!eventForm.isPaid} onChange={() => setEventForm(prev => ({ ...prev, isPaid: false, fee: '' }))} className="mr-2 text-purple-500 focus:ring-purple-400" />
                  <span className="text-white">Free Event</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="isPaid" value="true" checked={eventForm.isPaid} onChange={() => setEventForm(prev => ({ ...prev, isPaid: true }))} className="mr-2 text-purple-500 focus:ring-purple-400" />
                  <span className="text-white">Paid Event</span>
                </label>
              </div>
              {eventForm.isPaid && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-purple-300 mb-2">Registration Fee (₹) *</label>
                  <input type="number" name="fee" value={eventForm.fee} onChange={handleFormChange} min="1" step="0.01" required={eventForm.isPaid} placeholder="Enter amount" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <button type="button" disabled={!eventForm.fee || !eventForm.title || !eventForm.date} className="mt-2 w-full px-4 py-3 bg-purple-700/30 border border-purple-500/50 text-purple-300 rounded-lg font-medium disabled:opacity-50 hover:bg-purple-600/30 transition-colors" onClick={() => alert('Payment info integration coming soon!')}>Add Payment Info</button>
                </div>
              )}
            </div>
            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Tags (comma-separated)</label>
              <input type="text" name="tags" value={eventForm.tags} onChange={handleFormChange} placeholder="e.g., Technology, AI, Innovation" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            {/* Contact Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Contact Email</label>
                <input type="email" name="contactEmail" value={eventForm.contactEmail} readOnly className="w-full px-4 py-3 bg-transparent border border-purple-500/50 rounded-lg text-purple-300 placeholder-purple-400 focus:outline-none cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Contact Phone</label>
                <input type="text" name="contactPhone" value={eventForm.contactPhone} readOnly className="w-full px-4 py-3 bg-transparent border border-purple-500/50 rounded-lg text-purple-300 placeholder-purple-400 focus:outline-none cursor-not-allowed" />
              </div>
            </div>
            {/* Event Audience */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Event Audience</label>
              <select name="audienceType" value={eventForm.audienceType || ''} onChange={handleFormChange} required className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400">
                <option value="" className="bg-gray-800">Select audience</option>
                <option value="institution" className="bg-gray-800">My Institution Only</option>
                <option value="public" className="bg-gray-800">Public (Anyone can join)</option>
              </select>
            </div>
            {/* Co-hosts */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Co-hosts (Emails)</label>
              <div className="flex gap-2 mb-2">
                <input type="text" name="cohostInput" value={cohostInput} onChange={handleFormChange} placeholder="Enter co-host email" className="px-4 py-2 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none" />
                <button type="button" onClick={handleAddCohost} className="px-4 py-2 bg-purple-700 text-white rounded-lg">Add</button>
              </div>
              <ul className="list-disc pl-5">
                {eventForm.cohosts.map((email, idx) => (
                  <li key={email+idx} className="flex items-center gap-2 text-purple-200">
                    {email}
                    <button type="button" onClick={() => handleRemoveCohost(idx)} className="text-red-400 ml-2">Remove</button>
                  </li>
                ))}
              </ul>
            </div>
            {/* Sessions/Agenda */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Sessions/Agenda</label>
              <textarea name="sessions" value={eventForm.sessions || ''} onChange={handleFormChange} rows={3} placeholder="Session 1: Title, Speaker, Time\nSession 2: ..." className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            {/* Event Images */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Event Banner Image</label>
                <p className="text-xs text-purple-300/70 mb-2">Upload a banner image for your event. This will be displayed as the main event banner.</p>
                <input type="file" name="bannerImage" onChange={handleFormChange} accept="image/*" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600" />
                {bannerUrl && (
                  <div className="mt-2 w-full h-24 bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-purple-500/30">
                    <img src={bannerUrl} alt="Banner Preview" className="object-cover w-full h-full" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Event Logo Image</label>
                <p className="text-xs text-purple-300/70 mb-2">Upload a logo image for your event. This will be displayed as the event logo.</p>
                <input type="file" name="logoImage" onChange={handleFormChange} accept="image/*" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-700 file:text-white hover:file:bg-purple-600" />
                {logoUrl && (
                  <div className="mt-2 flex items-center justify-center">
                    <img src={logoUrl} alt="Logo Preview" className="object-cover w-16 h-16 rounded-full border-2 border-purple-500/50" />
                  </div>
                )}
              </div>
            </div>
            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Requirements (one per line)</label>
              <textarea name="requirements" value={eventForm.requirements} onChange={handleFormChange} rows={3} placeholder="List any requirements or prerequisites" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            {/* Event Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  name="certificateEnabled" 
                  checked={eventForm.certificateEnabled || false} 
                  onChange={(e) => setEventForm(prev => ({ ...prev, certificateEnabled: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 bg-transparent border-purple-500 rounded focus:ring-purple-500"
                />
                <label className="text-sm font-medium text-purple-300">Enable Certificates</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  name="chatEnabled" 
                  checked={eventForm.chatEnabled || false} 
                  onChange={(e) => setEventForm(prev => ({ ...prev, chatEnabled: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 bg-transparent border-purple-500 rounded focus:ring-purple-500"
                />
                <label className="text-sm font-medium text-purple-300">Enable Chat System</label>
              </div>
            </div>
            {/* Social Links */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Website</label>
                <input type="url" name="socialLinks.website" value={eventForm.socialLinks.website} onChange={handleFormChange} placeholder="https://example.com" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">LinkedIn</label>
                <input type="url" name="socialLinks.linkedin" value={eventForm.socialLinks.linkedin} onChange={handleFormChange} placeholder="https://linkedin.com/in/event" className="w-full px-4 py-3 bg-transparent border border-purple-500 rounded-lg text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <button type="submit" disabled={loading} className="flex-1 bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              {onCancel && (
                <button type="button" onClick={onCancel} className="px-6 py-3 border border-purple-500/50 text-purple-300 rounded-full font-medium transition-colors hover:bg-purple-900/30">Cancel</button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditEventForm;
