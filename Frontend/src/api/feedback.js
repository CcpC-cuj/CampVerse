// Feedback-related APIs aligned with Backend/Routes/feedbackRoutes.js
import { API_URL, getAuthHeaders } from './user';

export async function submitFeedback(formData) {
  const res = await fetch(`${API_URL}/api/feedback`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData, // FormData for multipart/form-data with optional attachment
  });
  return res.json();
}

export async function getMyFeedback() {
  const res = await fetch(`${API_URL}/api/feedback/my`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getAllFeedback(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/feedback/all${query ? `?${query}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function updateFeedbackStatus(id, payload) {
  const res = await fetch(`${API_URL}/api/feedback/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getFeedbackAnalytics() {
  const res = await fetch(`${API_URL}/api/feedback/analytics`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}