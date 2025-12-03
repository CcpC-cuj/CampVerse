// Upload event image (logo/banner) and return URL
export async function uploadEventImage(file, type) {
  // Legacy: not used anymore
  throw new Error('uploadEventImage is deprecated');
}
// Event-related API functions aligned with Backend/Routes/eventRoutes.js
import { API_URL, getAuthHeaders } from './user';

// Public: list events (limited)
export async function listEvents(filters = {}) {
  const queryParams = new URLSearchParams(filters).toString();
  const url = queryParams ? `${API_URL}/api/events?${queryParams}` : `${API_URL}/api/events`;
  const res = await fetch(url, { headers: { ...getAuthHeaders() } });
  return res.json();
}

// Get events for current user (student dashboard) - Returns events user has RSVPed for
export async function getUserEvents() {
  const res = await fetch(`${API_URL}/api/events/user`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await res.json();
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
  const params = new URLSearchParams({ q: query, ...filters }).toString();
  const res = await fetch(`${API_URL}/api/events/search?${params}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

// Create event (for hosts)
export async function createEvent(eventData) {
  const res = await fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders() 
    },
    body: JSON.stringify(eventData),
  });
  return res.json();
}

// Create event with file upload (for hosts with images)
export async function createEventWithFiles(formData) {
  const res = await fetch(`${API_URL}/api/events`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return res.json();
}

export async function getEventById(id) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await res.json();
  
  // Handle both old and new response formats
  if (data.success && data.data) {
    return data; // New format with success/data structure
  } else {
    // Old format - wrap in success structure for consistency
    return {
      success: res.ok,
      data: data,
      error: res.ok ? null : data.error || 'Failed to fetch event'
    };
  }
}

// Public event fetching with optional authentication (for shared links)
// If user is logged in, backend will include their registration status
export async function getPublicEventById(id) {
  const res = await fetch(`${API_URL}/api/events/public/${id}`, {
    headers: { ...getAuthHeaders() }, // Include auth headers if available (optional)
  });
  const data = await res.json();
  
  // Handle both old and new response formats
  if (data.success && data.data) {
    return data; // New format with success/data structure
  } else {
    // Old format - wrap in success structure for consistency
    return {
      success: res.ok,
      data: data,
      error: res.ok ? null : data.error || 'Failed to fetch event'
    };
  }
}

export async function updateEvent(id, eventData) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders() 
    },
    body: JSON.stringify(eventData),
  });
  return res.json();
}

// Update event with file upload
export async function updateEventWithFiles(id, formData) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return res.json();
}

export async function nominateCoHost(data) {
  const res = await fetch(`${API_URL}/api/events/nominate-cohost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to delete event');
  }
  
  return { success: true, message: 'Event deleted successfully' };
}

export async function rsvpEvent(eventId) {
  const res = await fetch(`${API_URL}/api/events/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId }),
  });
  const data = await res.json();
  // Normalize response
  if (res.status === 201 || (res.ok && data.message)) {
    return { success: true, message: data.message, data };
  } else if (res.status === 409) {
    return { success: false, message: data.error || 'Already registered for this event', error: data.error };
  }
  return { success: false, message: data.error || 'RSVP failed', error: data.error };
}

// Cancel RSVP - removed duplicate, using POST /cancel-rsvp version below

// Get event participants (for hosts)
export async function getEventParticipants(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/participants`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

// Get upcoming events

// Utility: Filter upcoming events from listEvents
export async function getUpcomingEvents() {
  const now = new Date();
  const data = await listEvents();
  const events = (data.data && data.data.events) || data.events || [];
  const upcomingEvents = events.filter(ev => {
    if (ev.date) {
      return new Date(ev.date) > now;
    }
    return false;
  });
  return { success: true, data: { events: upcomingEvents, total: upcomingEvents.length } };
}

// Utility: Filter past events from listEvents
export async function getPastEvents() {
  const now = new Date();
  const data = await listEvents();
  const events = (data.data && data.data.events) || data.events || [];
  const pastEvents = events.filter(ev => {
    if (ev.date) {
      return new Date(ev.date) < now;
    }
    return false;
  });
  return { success: true, data: { events: pastEvents, total: pastEvents.length } };
}

export async function cancelRsvp(eventId) {
  const res = await fetch(`${API_URL}/api/events/cancel-rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId }),
  });
  const data = await res.json();
  // Normalize response
  if (res.ok && data.message) {
    return { success: true, message: data.message, data };
  }
  return { success: false, message: data.error || 'Cancel RSVP failed', error: data.error };
}

export async function getParticipants(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/participants`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function scanQr(eventId, qrToken) {
  const res = await fetch(`${API_URL}/api/events/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId, qrToken }),
  });
  return res.json();
}

export async function getEventAnalytics(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/analytics`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}


export async function approveCoHost(eventId, userId) {
  const res = await fetch(`${API_URL}/api/events/approve-cohost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId, userId }),
  });
  return res.json();
}

export async function rejectCoHost(eventId, userId) {
  const res = await fetch(`${API_URL}/api/events/reject-cohost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId, userId }),
  });
  return res.json();
}

export async function verifyEvent(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/verify`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function rejectEvent(eventId, reason = '') {
  const res = await fetch(`${API_URL}/api/events/${eventId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ reason }),
  });
  return res.json();
}

export async function getGoogleCalendarLink(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/calendar-link`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function advancedEventSearch(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/events/search${query ? `?${query}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getUserAnalytics(userId) {
  const res = await fetch(`${API_URL}/api/events/user-analytics/${userId}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getPlatformInsights() {
  const res = await fetch(`${API_URL}/api/events/platform-insights`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getSearchAnalytics() {
  const res = await fetch(`${API_URL}/api/events/search-analytics`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getAdvancedEventAnalytics(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/advanced-analytics`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getUserActivityTimeline(userId) {
  const res = await fetch(`${API_URL}/api/events/user-activity/${userId}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getGrowthTrends() {
  const res = await fetch(`${API_URL}/api/events/admin/growth-trends`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

// Get QR code for an event
export async function getEventQrCode(eventId) {
  const res = await fetch(`${API_URL}/api/events/${eventId}/qrcode`, {
    headers: { ...getAuthHeaders() },
  });
  // Expecting a response with { qrcode: 'data:image/png;base64,...' }
  return res.json();
}

// Get user's QR code for a registered event
export async function getMyEventQrCode(eventId, cacheBuster = '') {
  const res = await fetch(`${API_URL}/api/events/my-qr/${eventId}${cacheBuster}`, {
    headers: { ...getAuthHeaders() },
    cache: 'no-store', // Force no caching
  });
  return res.json();
}

export async function getZeroResultSearches() {
  const res = await fetch(`${API_URL}/api/events/admin/zero-result-searches`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getVerifierAnalytics() {
  const res = await fetch(`${API_URL}/api/events/verifier-analytics`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

// Get personalized event recommendations
export async function getEventRecommendations(limit = 6) {
  const res = await fetch(`${API_URL}/api/recommendations/events?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

// Get similar events based on an event
export async function getSimilarEvents(eventId, limit = 4) {
  const res = await fetch(`${API_URL}/api/recommendations/events/${eventId}/similar?limit=${limit}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}


