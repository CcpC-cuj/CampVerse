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
  const res = await fetch(`${API_URL}/api/institutions/${institutionId}/request-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}
