// Host-related APIs aligned with Backend/Routes/hostRoutes.js
import { API_URL, getAuthHeaders } from './user';

export async function getHostDashboard() {
  const res = await fetch(`${API_URL}/api/hosts/dashboard`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getMyEvents() {
  const res = await fetch(`${API_URL}/api/hosts/my-events`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function createHostEvent(payload) {
  const res = await fetch(`${API_URL}/api/hosts/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateHostEvent(id, payload) {
  const res = await fetch(`${API_URL}/api/hosts/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteHostEvent(id) {
  const res = await fetch(`${API_URL}/api/hosts/events/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getHostEventParticipants(id) {
  const res = await fetch(`${API_URL}/api/hosts/events/${id}/participants`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

