// Support-related APIs aligned with Backend/Routes/supportRoutes.js
import { API_URL, getAuthHeaders } from './user';

export async function submitTicket(formData) {
  const res = await fetch(`${API_URL}/api/support/tickets`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
  });
  return res.json();
}

export async function getMyTickets() {
  const res = await fetch(`${API_URL}/api/support/tickets/my`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getTicketById(id) {
  const res = await fetch(`${API_URL}/api/support/tickets/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getAllTickets(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/support/tickets${query ? `?${query}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function updateTicket(id, payload) {
  const res = await fetch(`${API_URL}/api/support/tickets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getSupportAnalytics() {
  const res = await fetch(`${API_URL}/api/support/analytics`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}


