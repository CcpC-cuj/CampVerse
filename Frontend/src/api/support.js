import api from './axiosInstance';

export async function submitTicket(formData) {
  const response = await api.post('/api/support/tickets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function getMyTickets() {
  const response = await api.get('/api/support/tickets/my');
  return response.data;
}

export async function getTicketById(id) {
  const response = await api.get(`/api/support/tickets/${id}`);
  return response.data;
}

export async function getAllTickets(params = {}) {
  const response = await api.get('/api/support/tickets', { params });
  return response.data;
}

export async function updateTicket(id, payload) {
  const response = await api.patch(`/api/support/tickets/${id}`, payload);
  return response.data;
}

export async function getSupportAnalytics() {
  const response = await api.get('/api/support/analytics');
  return response.data;
}


