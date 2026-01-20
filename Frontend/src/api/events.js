import api from './axiosInstance';

// Event-related API functions aligned with Backend/Routes/eventRoutes.js
export const API_URL = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

// Public: list events (limited)
export async function listEvents(filters = {}) {
  const response = await api.get('/api/events', { params: filters });
  return response.data;
}

// Get events for current user (student dashboard) - Returns events user has RSVPed for
export async function getUserEvents() {
  const response = await api.get('/api/events/user');
  const data = response.data;
  // Return in consistent format: { success, data: { registeredEvents: [...] } }
  if (data.success && data.data && data.data.events) {
    return {
      success: true,
      data: {
        registeredEvents: data.data.events,
        events: data.data.events, // backward compatibility
        total: data.data.total
      }
    };
  }
  return data;
}

// Search events
export async function searchEvents(query, filters = {}) {
  const response = await api.get('/api/events/search', { params: { q: query, ...filters } });
  return response.data;
}

// Create event (for hosts)
export async function createEvent(eventData) {
  const response = await api.post('/api/events', eventData);
  return response.data;
}

// Create event with file upload (for hosts with images)
export async function createEventWithFiles(formData) {
  const response = await api.post('/api/events', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function getEventById(id) {
  const response = await api.get(`/api/events/${id}`);
  const data = response.data;
  
  // Handle both old and new response formats
  if (data.success && data.data) {
    return data;
  } else {
    return {
      success: true,
      data: data,
      error: null
    };
  }
}

// Public event fetching with optional authentication (for shared links)
export async function getPublicEventById(id) {
  const response = await api.get(`/api/events/public/${id}`);
  const data = response.data;
  
  if (data.success && data.data) {
    return data;
  } else {
    return {
      success: true,
      data: data,
      error: null
    };
  }
}

export async function updateEvent(id, eventData) {
  const response = await api.patch(`/api/events/${id}`, eventData);
  return response.data;
}

// Update event with file upload
export async function updateEventWithFiles(id, formData) {
  const response = await api.patch(`/api/events/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function nominateCoHost(data) {
  const response = await api.post('/api/events/nominate-cohost', data);
  return response.data;
}

export async function deleteEvent(id) {
  const response = await api.delete(`/api/events/${id}`);
  return response.data;
}

export async function rsvpEvent(eventId) {
  try {
    const response = await api.post('/api/events/rsvp', { eventId });
    const data = response.data;
    return { success: true, message: data.message, data };
  } catch (error) {
    const data = error.response?.data || {};
    return { 
      success: false, 
      message: data.error || 'RSVP failed', 
      error: data.error 
    };
  }
}

// Get event participants (for hosts)
export async function getEventParticipants(eventId) {
  const response = await api.get(`/api/events/${eventId}/participants`);
  return response.data;
}

// Utility: Filter upcoming events from listEvents
export async function getUpcomingEvents() {
  const now = new Date();
  const data = await listEvents();
  const events = (data.data && data.data.events) || data.events || [];
  const upcomingEvents = events.filter(ev => ev.date && new Date(ev.date) > now);
  return { success: true, data: { events: upcomingEvents, total: upcomingEvents.length } };
}

// Utility: Filter past events from listEvents
export async function getPastEvents() {
  const now = new Date();
  const data = await listEvents();
  const events = (data.data && data.data.events) || data.events || [];
  const pastEvents = events.filter(ev => ev.date && new Date(ev.date) < now);
  return { success: true, data: { events: pastEvents, total: pastEvents.length } };
}

export async function cancelRsvp(eventId) {
  try {
    const response = await api.post('/api/events/cancel-rsvp', { eventId });
    return { success: true, message: response.data.message, data: response.data };
  } catch (error) {
    const data = error.response?.data || {};
    return { success: false, message: data.error || 'Cancel RSVP failed', error: data.error };
  }
}

export async function getParticipants(eventId) {
  const response = await api.get(`/api/events/${eventId}/participants`);
  return response.data;
}

export async function scanQr(eventId, qrToken) {
  const response = await api.post('/api/events/scan', { eventId, qrToken });
  return response.data;
}

export async function getEventAnalytics(eventId) {
  const response = await api.get(`/api/events/${eventId}/analytics`);
  return response.data;
}

export async function approveCoHost(eventId, userId) {
  const response = await api.post('/api/events/approve-cohost', { eventId, userId });
  return response.data;
}

export async function rejectCoHost(eventId, userId) {
  const response = await api.post('/api/events/reject-cohost', { eventId, userId });
  return response.data;
}

export async function verifyEvent(eventId) {
  const response = await api.post(`/api/events/${eventId}/verify`);
  return response.data;
}

export async function rejectEvent(eventId, reason = '') {
  const response = await api.post(`/api/events/${eventId}/reject`, { reason });
  return response.data;
}

export async function getGoogleCalendarLink(eventId) {
  const response = await api.get(`/api/events/${eventId}/calendar-link`);
  return response.data;
}

export async function advancedEventSearch(params = {}) {
  const response = await api.get('/api/events/search', { params });
  return response.data;
}

export async function getUserAnalytics(userId) {
  const response = await api.get(`/api/events/user-analytics/${userId}`);
  return response.data;
}

export async function getPlatformInsights() {
  const response = await api.get('/api/events/platform-insights');
  return response.data;
}

export async function getSearchAnalytics() {
  const response = await api.get('/api/events/search-analytics');
  return response.data;
}

export async function getAdvancedEventAnalytics(eventId) {
  const response = await api.get(`/api/events/${eventId}/advanced-analytics`);
  return response.data;
}

export async function getUserActivityTimeline(userId) {
  const response = await api.get(`/api/events/user-activity/${userId}`);
  return response.data;
}

export async function getGrowthTrends() {
  const response = await api.get('/api/events/admin/growth-trends');
  return response.data;
}

// Get QR code for an event
export async function getEventQrCode(eventId) {
  const response = await api.get(`/api/events/${eventId}/qrcode`);
  return response.data;
}

// Get user's QR code for a registered event
export async function getMyEventQrCode(eventId, cacheBuster = '') {
  const response = await api.get(`/api/events/my-qr/${eventId}${cacheBuster}`, {
    headers: { 'Cache-Control': 'no-cache' }
  });
  return response.data;
}

export async function getZeroResultSearches() {
  const response = await api.get('/api/events/admin/zero-result-searches');
  return response.data;
}

export async function getVerifierAnalytics() {
  const response = await api.get('/api/events/verifier-analytics');
  return response.data;
}

// Get personalized event recommendations
export async function getEventRecommendations(limit = 6) {
  const response = await api.get('/api/recommendations/events', { params: { limit } });
  return response.data;
}

// Get similar events based on an event
export async function getSimilarEvents(eventId, limit = 4) {
  const response = await api.get(`/api/recommendations/events/${eventId}/similar`, { params: { limit } });
  return response.data;
}

// Get Host Analytics
export async function getHostAnalytics() {
  const response = await api.get('/api/events/host/analytics');
  return response.data;
}


