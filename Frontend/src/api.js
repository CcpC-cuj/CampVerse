// src/api.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export async function resendOtp({ email }) {
  const res = await fetch(`${API_URL}/api/users/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return res.json();
}

// Add more API functions as needed (e.g., getProfile, updateProfile, etc.) 