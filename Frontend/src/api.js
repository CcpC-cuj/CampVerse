// src/api.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function updateLocalUserIfPresent(data) {
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
  console.log("🔵 [FRONTEND] Google Sign-In attempt started");
  console.log("🔵 [FRONTEND] Token being sent to server:", token?.substring(0, 50) + "...");
  console.log("🔵 [FRONTEND] Full token length:", token?.length);
  console.log("🔵 [FRONTEND] Timestamp:", new Date().toISOString());

  const res = await fetch(`${API_URL}/api/users/google-signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  const data = await res.json();
  console.log("🔵 [FRONTEND] Response received from server:", data);
  console.log("🔵 [FRONTEND] Response timestamp:", new Date().toISOString());

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

// Authentication management functions
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

// Dashboard and profile
export async function getDashboard() {
  const res = await fetch(`${API_URL}/api/users`, {
    headers: { ...getAuthHeaders() }
  });
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

// Institutions
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

// Notifications
export async function getNotifications(limit = 20) {
  const res = await fetch(`${API_URL}/api/users/notifications?limit=${limit}`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function markNotificationAsRead(id) {
  const res = await fetch(`${API_URL}/api/users/notifications/${id}/read`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function markAllNotificationsAsRead() {
  const res = await fetch(`${API_URL}/api/users/notifications/read-all`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

// Settings: Notification preferences
export async function getMyNotificationPreferences() {
  const res = await fetch(`${API_URL}/api/users/me/notification-preferences`, {
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

export async function updateMyNotificationPreferences(payload) {
  const res = await fetch(`${API_URL}/api/users/me/notification-preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// Settings: Delete my account (schedule)
export async function deleteMyAccount() {
  const res = await fetch(`${API_URL}/api/users/me/delete`, {
    method: 'POST',
    headers: { ...getAuthHeaders() }
  });
  return res.json();
}

// Add more API functions as needed (e.g., getProfile, updateProfile, etc.)