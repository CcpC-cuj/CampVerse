import api from './axiosInstance';

export async function getHostDashboard() {
  const response = await api.get('/api/hosts/dashboard');
  return response.data;
}

export async function getMyEvents() {
  const response = await api.get('/api/hosts/my-events');
  return response.data;
}

export async function createHostEvent(payload) {
  const response = await api.post('/api/hosts/events', payload);
  return response.data;
}

export async function updateHostEvent(id, payload) {
  const response = await api.patch(`/api/hosts/events/${id}`, payload);
  return response.data;
}

export async function deleteHostEvent(id) {
  const response = await api.delete(`/api/hosts/events/${id}`);
  return response.data;
}

export async function getHostEventParticipants(id) {
  const response = await api.get(`/api/hosts/events/${id}/participants`);
  return response.data;
}

