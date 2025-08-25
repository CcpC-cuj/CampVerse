// Notification-related API functions
import { API_URL, getAuthHeaders } from './user';

export async function getNotifications(limit = 20) {
  const res = await fetch(`${API_URL}/api/users/notifications?limit=${limit}`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function markNotificationAsRead(id) {
  const res = await fetch(`${API_URL}/api/users/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function markAllNotificationsAsRead() {
  const res = await fetch(`${API_URL}/api/users/notifications/read-all`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function getMyNotificationPreferences() {
  const res = await fetch(`${API_URL}/api/users/me/notification-preferences`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function updateMyNotificationPreferences(payload) {
  const res = await fetch(`${API_URL}/api/users/me/notification-preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}
