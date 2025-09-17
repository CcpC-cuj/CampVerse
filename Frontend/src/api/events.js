// Event-related API functions aligned with Backend/Routes/eventRoutes.js
import { API_URL, getAuthHeaders } from './user';

// Public: list events (limited)
export async function listEvents() {
  const res = await fetch(`${API_URL}/api/events`);
  return res.json();
}

export async function createEvent(formData) {
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
  return res.json();
}

export async function updateEvent(id, formData) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return res.json();
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_URL}/api/events/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function rsvpEvent(eventId) {
  const res = await fetch(`${API_URL}/api/events/rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId }),
  });
  return res.json();
}

export async function cancelRsvp(eventId) {
  const res = await fetch(`${API_URL}/api/events/cancel-rsvp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId }),
  });
  return res.json();
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

export async function nominateCoHost(eventId, userId) {
  const res = await fetch(`${API_URL}/api/events/nominate-cohost`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ eventId, userId }),
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

export async function getZeroResultSearches() {
  const res = await fetch(`${API_URL}/api/events/admin/zero-result-searches`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}


