import api from './axiosInstance';

export async function getNotifications(limit = 20) {
  const response = await api.get('/api/users/notifications', { params: { limit } });
  return response.data;
}

export async function markNotificationAsRead(id) {
  const response = await api.patch(`/api/users/notifications/${id}/read`);
  return response.data;
}

export async function markAllNotificationsAsRead() {
  const response = await api.patch('/api/users/notifications/read-all');
  return response.data;
}

export async function getMyNotificationPreferences() {
  const response = await api.get('/api/users/me/notification-preferences');
  return response.data;
}

export async function updateMyNotificationPreferences(payload) {
  const response = await api.patch('/api/users/me/notification-preferences', payload);
  return response.data;
}
