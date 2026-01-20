import api from './axiosInstance';

export async function submitFeedback(formData) {
  const response = await api.post('/api/feedback', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function getMyFeedback() {
  const response = await api.get('/api/feedback/my');
  return response.data;
}

export async function getAllFeedback(params = {}) {
  const response = await api.get('/api/feedback/all', { params });
  return response.data;
}

export async function updateFeedbackStatus(id, payload) {
  const response = await api.patch(`/api/feedback/${id}/status`, payload);
  return response.data;
}

export async function getFeedbackAnalytics() {
  const response = await api.get('/api/feedback/analytics');
  return response.data;
}