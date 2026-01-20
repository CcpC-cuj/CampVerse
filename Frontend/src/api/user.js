import api from './axiosInstance';

export const API_URL = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

export function updateLocalUserIfPresent(data) {
  if (data && data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
}

export async function register({ name, email, phone, password }) {
  const response = await api.post('/api/users/register', { name, email, phone, password });
  return response.data;
}

export async function verifyOtp({ email, otp }) {
  const response = await api.post('/api/users/verify', { email, otp });
  const data = response.data;
  if (data.token) {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function login({ email, password }) {
  const response = await api.post('/api/users/login', { email, password });
  const data = response.data;
  if (data.token) {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function googleSignIn({ token }) {
  const response = await api.post('/api/users/google-signin', { token });
  const data = response.data;
  if (data.token) {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function linkGoogleAccount({ email, password, token }) {
  const response = await api.post('/api/users/link-google', { email, password, googleToken: token });
  return response.data;
}

export async function unlinkGoogleAccount() {
  const response = await api.post('/api/users/unlink-google');
  return response.data;
}

export async function forgotPassword({ email }) {
  const response = await api.post('/api/users/forgot-password', { email });
  return response.data;
}

export async function getAuthStatus() {
  const response = await api.get('/api/users/auth-status');
  return response.data;
}

export async function setupPassword({ newPassword }) {
  const response = await api.post('/api/users/setup-password', { newPassword });
  return response.data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const response = await api.post('/api/users/change-password', { currentPassword, newPassword });
  return response.data;
}

export async function sendVerificationOtp() {
  const response = await api.post('/api/users/send-verification-otp');
  return response.data;
}

export async function verifyOtpForGoogleUser({ otp }) {
  const response = await api.post('/api/users/verify-otp', { otp });
  return response.data;
}

export async function resendOtp({ email }) {
  const response = await api.post('/api/users/resend-otp', { email });
  return response.data;
}

export async function getDashboard() {
  try {
    const response = await api.get('/api/users');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      return { error: 'unauthorized', message: 'Please log in again.' };
    }
    throw error;
  }
}

export async function getMe() {
  try {
    const response = await api.get('/api/users/me');
    const data = response.data;
    if (data && !data.error) {
      localStorage.setItem('user', JSON.stringify(data));
    }
    return data;
  } catch (error) {
    if (error.response?.status === 401) {
      return { error: 'unauthorized', message: 'Please log in again.' };
    }
    throw error;
  }
}

export async function updateMe(payload) {
  const response = await api.patch('/api/users/me', payload);
  const data = response.data;
  updateLocalUserIfPresent(data);
  return data;
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  const response = await api.post('/api/users/me/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const data = response.data;
  updateLocalUserIfPresent(data);
  return data;
}

export async function deleteMyAccount() {
  const response = await api.post('/api/users/me/delete');
  return response.data;
}

export async function resetPassword({ token, password }) {
  const response = await api.post('/api/users/reset-password', { token, password });
  return response.data;
}

export async function updatePreferences(payload) {
  const response = await api.post('/api/users/updatePreferences', payload);
  const data = response.data;
  updateLocalUserIfPresent(data);
  return data;
}

export async function trackReferral(payload) {
  const response = await api.post('/api/users/track-referral', payload);
  return response.data;
}

export async function getUserBadges() {
  const response = await api.get('/api/users/badges');
  return response.data;
}

export async function requestHostAccess(formData) {
  const response = await api.post('/api/users/me/request-host', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  const data = response.data;
  updateLocalUserIfPresent(data);
  return data;
}

export async function listPendingHostRequests() {
  const response = await api.get('/api/users/host-requests/pending');
  return response.data;
}

export async function approveHostRequest(id, payload) {
  const response = await api.post(`/api/users/host-requests/${id}/approve`, payload);
  return response.data;
}

export async function rejectHostRequest(id, payload) {
  const response = await api.post(`/api/users/host-requests/${id}/reject`, payload);
  return response.data;
}

export async function logout() {
  try {
    const response = await api.post('/api/users/logout');
    if (response.status === 200) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return response.data;
  } catch (error) {
    // Force clear on error
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    throw error;
  }
}

export async function findUserByEmail(email) {
  const response = await api.get('/api/find-user', { params: { email } });
  return response.data;
}
