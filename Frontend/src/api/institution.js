import api from './axiosInstance';
import { updateLocalUserIfPresent } from './user';

export async function searchInstitutions(q) {
  const response = await api.get('/api/institutions/search', { params: { q } });
  return response.data;
}

export async function getInstitutionById(id) {
  const response = await api.get(`/api/institutions/${id}`);
  return response.data;
}

export async function setInstitutionForMe(institutionId) {
  const response = await api.post('/api/users/me/set-institution', { institutionId });
  const data = response.data;
  updateLocalUserIfPresent(data);
  return data;
}

export async function requestNewInstitution(payload) {
  const response = await api.post('/api/institutions/request-new', payload);
  return response.data;
}

export async function requestInstitutionVerification(institutionId, payload) {
  return { error: 'request-verification endpoint removed; use requestNewInstitution or admin approval flow' };
}

export async function getPendingInstitutionVerifications() {
  const response = await api.get('/api/institutions/pending-verifications');
  return response.data;
}

export async function approveInstitutionVerificationAPI(id, payload = {}) {
  const response = await api.post(`/api/institutions/${id}/approve-verification`, payload);
  return response.data;
}

export async function rejectInstitutionVerificationAPI(id, payload = {}) {
  const response = await api.post(`/api/institutions/${id}/reject-verification`, payload);
  return response.data;
}

export async function getInstitutionAnalytics(id) {
  const response = await api.get(`/api/institutions/${id}/analytics`);
  return response.data;
}

export async function getInstitutionDashboard(id) {
  const response = await api.get(`/api/institutions/${id}/dashboard`);
  return response.data;
}

export async function getInstitutionMembers(id, page = 1, limit = 20) {
  const response = await api.get(`/api/institutions/${id}/members`, { params: { page, limit } });
  return response.data;
}

export async function getInstitutionEvents(id, page = 1, limit = 10, filter = 'all') {
  const response = await api.get(`/api/institutions/${id}/events`, { params: { page, limit, filter } });
  return response.data;
}
