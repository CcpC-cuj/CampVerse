// User-related API functions and helpers
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function updateLocalUserIfPresent(data) {
  if (data && data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
}

export async function register({ name, email, phone, password }) {
  const res = await fetch(`${API_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password })
  });
  return res.json();
}

export async function verifyOtp({ email, otp }) {
  const res = await fetch(`${API_URL}/api/users/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function login({ email, password }) {
  const res = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function googleSignIn({ token }) {
  const res = await fetch(`${API_URL}/api/users/google-signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

export async function linkGoogleAccount({ email, password, token }) {
  const res = await fetch(`${API_URL}/api/users/link-google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, googleToken: token })
  });
  return res.json();
}

export async function unlinkGoogleAccount() {
  const res = await fetch(`${API_URL}/api/users/unlink-google`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function forgotPassword({ email }) {
  const res = await fetch(`${API_URL}/api/users/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function getAuthStatus() {
  const res = await fetch(`${API_URL}/api/users/auth-status`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function setupPassword({ newPassword }) {
  const res = await fetch(`${API_URL}/api/users/setup-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ newPassword })
  });
  return res.json();
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await fetch(`${API_URL}/api/users/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return res.json();
}

export async function sendVerificationOtp() {
  const res = await fetch(`${API_URL}/api/users/send-verification-otp`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function verifyOtpForGoogleUser({ otp }) {
  const res = await fetch(`${API_URL}/api/users/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ otp })
  });
  return res.json();
}

export async function resendOtp({ email }) {
  const res = await fetch(`${API_URL}/api/users/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function getDashboard() {
  const res = await fetch(`${API_URL}/api/users`, {
    headers: { ...getAuthHeaders() }
  });
  if (res.status === 401) {
    return { error: 'unauthorized', message: 'Please log in again.' };
  }
  return res.json();
}

export async function updateMe(payload) {
  const res = await fetch(`${API_URL}/api/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  updateLocalUserIfPresent(data);
  return data;
}

export async function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);
  const res = await fetch(`${API_URL}/api/users/me/profile-photo`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData
  });
  const data = await res.json();
  updateLocalUserIfPresent(data);
  return data;
}

export async function deleteMyAccount() {
  const res = await fetch(`${API_URL}/api/users/me/delete`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function resetPassword({ token, password }) {
  const res = await fetch(`${API_URL}/api/users/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });
  return res.json();
}

// Missing user APIs that are implemented in backend
export async function updatePreferences(payload) {
  const res = await fetch(`${API_URL}/api/users/updatePreferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  updateLocalUserIfPresent(data);
  return data;
}

export async function trackReferral(payload) {
  const res = await fetch(`${API_URL}/api/users/track-referral`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function getUserBadges() {
  const res = await fetch(`${API_URL}/api/users/badges`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function requestHostAccess(formData) {
  const res = await fetch(`${API_URL}/api/users/me/request-host`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData // FormData for multipart with idCardPhoto and eventPermission
  });
  const data = await res.json();
  updateLocalUserIfPresent(data);
  return data;
}

export async function listPendingHostRequests() {
  const res = await fetch(`${API_URL}/api/users/host-requests/pending`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function approveHostRequest(id, payload) {
  const res = await fetch(`${API_URL}/api/users/host-requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function rejectHostRequest(id, payload) {
  const res = await fetch(`${API_URL}/api/users/host-requests/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function logout() {
  const res = await fetch(`${API_URL}/api/users/logout`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  if (res.ok) {
    // Clear local storage on successful logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  return res.json();
}
