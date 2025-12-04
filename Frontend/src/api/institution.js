// Institution-related API functions
import { API_URL, getAuthHeaders, updateLocalUserIfPresent } from './user';

export async function searchInstitutions(q) {
  const res = await fetch(`${API_URL}/api/institutions/search?q=${encodeURIComponent(q)}`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function getInstitutionById(id) {
  const res = await fetch(`${API_URL}/api/institutions/${id}`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function setInstitutionForMe(institutionId) {
  const res = await fetch(`${API_URL}/api/users/me/set-institution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ institutionId })
  });
  const data = await res.json();
  updateLocalUserIfPresent(data);
  return data;
}

export async function requestNewInstitution(payload) {
  const res = await fetch(`${API_URL}/api/institutions/request-new`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function requestInstitutionVerification(institutionId, payload) {
  // Backend removed standalone request-verification; keep a no-op to prevent crashes
  return { error: 'request-verification endpoint removed; use requestNewInstitution or admin approval flow' };
}

export async function getPendingInstitutionVerifications() {
  const res = await fetch(`${API_URL}/api/institutions/pending-verifications`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function approveInstitutionVerificationAPI(id, payload = {}) {
  const res = await fetch(`${API_URL}/api/institutions/${id}/approve-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function rejectInstitutionVerificationAPI(id, payload = {}) {
  const res = await fetch(`${API_URL}/api/institutions/${id}/reject-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getInstitutionAnalytics(id) {
  const res = await fetch(`${API_URL}/api/institutions/${id}/analytics`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}

export async function getInstitutionDashboard(id) {
  const res = await fetch(`${API_URL}/api/institutions/${id}/dashboard`, {
    headers: { ...getAuthHeaders() },
  });
  return res.json();
}
