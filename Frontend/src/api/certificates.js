// Certificate-related APIs aligned with Backend/Routes/certificateRoutes.js
import { API_URL, getAuthHeaders } from './user';

export async function generateCertificate(payload) {
  const res = await fetch(`${API_URL}/api/certificates/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getMyCertificates() {
  const res = await fetch(`${API_URL}/api/certificates/my`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getCertificatesForUser(userId) {
  const res = await fetch(`${API_URL}/api/certificates/user/${userId}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getCertificateStats() {
  const res = await fetch(`${API_URL}/api/certificates/stats`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getCertificateById(id) {
  const res = await fetch(`${API_URL}/api/certificates/${id}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function verifyCertificate(payload) {
  const res = await fetch(`${API_URL}/api/certificates/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function exportAttendedUsers(eventId) {
  const res = await fetch(`${API_URL}/api/certificates/export-attended/${eventId}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function retryCertificateGeneration(certificateId) {
  const res = await fetch(`${API_URL}/api/certificates/${certificateId}/retry`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function generateBatchCertificates(payload) {
  const res = await fetch(`${API_URL}/api/certificates/generate-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getCertificateProgress(eventId) {
  const res = await fetch(`${API_URL}/api/certificates/progress/${eventId}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function sendCertificateNotification(certificateId) {
  const res = await fetch(`${API_URL}/api/certificates/${certificateId}/notify`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getCertificateDashboard(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/api/certificates/dashboard${query ? `?${query}` : ''}`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function bulkRetryFailedCertificates(eventId) {
  const res = await fetch(`${API_URL}/api/certificates/${eventId}/bulk-retry`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}


