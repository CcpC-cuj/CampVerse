import api from './axiosInstance';

export async function generateCertificate(payload) {
  const response = await api.post('/api/certificates/generate', payload);
  return response.data;
}

export async function getMyCertificates() {
  const response = await api.get('/api/certificates/my');
  return response.data;
}

export async function getCertificatesForUser(userId) {
  const response = await api.get(`/api/certificates/user/${userId}`);
  return response.data;
}

export async function getCertificateStats() {
  const response = await api.get('/api/certificates/stats');
  return response.data;
}

export async function getCertificateById(id) {
  const response = await api.get(`/api/certificates/${id}`);
  return response.data;
}

export async function verifyCertificate(payload) {
  const response = await api.post('/api/certificates/verify', payload);
  return response.data;
}

export async function exportAttendedUsers(eventId) {
  const response = await api.get(`/api/certificates/export-attended/${eventId}`);
  return response.data;
}

export async function retryCertificateGeneration(certificateId) {
  const response = await api.post(`/api/certificates/${certificateId}/retry`);
  return response.data;
}

export async function generateBatchCertificates(payload) {
  const response = await api.post('/api/certificates/generate-batch', payload);
  return response.data;
}

export async function getCertificateProgress(eventId) {
  const response = await api.get(`/api/certificates/progress/${eventId}`);
  return response.data;
}

export async function sendCertificateNotification(certificateId) {
  const response = await api.post(`/api/certificates/${certificateId}/notify`);
  return response.data;
}

export async function getCertificateDashboard(params = {}) {
  const response = await api.get('/api/certificates/dashboard', { params });
  return response.data;
}

export async function bulkRetryFailedCertificates(eventId) {
  const response = await api.post(`/api/certificates/${eventId}/bulk-retry`);
  return response.data;
}

export async function approveCertificate(certificateId) {
  const response = await api.post(`/api/certificates/${certificateId}/approve`);
  return response.data;
}

export async function rejectCertificate(certificateId, reason = '') {
  const response = await api.post(`/api/certificates/${certificateId}/reject`, { reason });
  return response.data;
}


