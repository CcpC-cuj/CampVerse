import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

// Create axios instance with interceptors for auth operations
// CRITICAL: withCredentials must be true for HttpOnly cookies to work
const authAxios = axios.create({
  baseURL: `${API_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for cross-origin cookies (Vercel -> Render)
});

// Add auth header to requests
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Refresh access token using HttpOnly cookie
 * The refresh token is automatically sent by the browser as a cookie
 * No need to pass it manually!
 * 
 * @returns {Promise<Object>} New access token and user data
 */
export async function refreshAccessToken() {
  try {
    // Browser automatically sends the httpOnly cookie
    const response = await authAxios.post('/refresh', {});
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Logout - clears the HttpOnly cookie on server side
 * @returns {Promise<Object>} Success status
 */
export async function logout() {
  try {
    const response = await authAxios.post('/logout');
    return response.data;
  } catch (error) {
    // Even if logout fails, we should clear local storage
    console.error('Logout API error:', error);
    throw error;
  }
}

/**
 * Get all active sessions for current user
 * @returns {Promise<Object>} List of active sessions
 */
export async function getActiveSessions() {
  try {
    const response = await authAxios.get('/sessions');
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Revoke a specific session
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<Object>} Success status
 */
export async function revokeSession(sessionId) {
  try {
    const response = await authAxios.delete(`/sessions/${sessionId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Revoke all sessions (logout everywhere)
 * @param {boolean} keepCurrent - Keep current session active
 * @returns {Promise<Object>} Number of revoked sessions
 */
export async function revokeAllSessions(keepCurrent = false) {
  try {
    const response = await authAxios.delete(`/sessions?keepCurrent=${keepCurrent}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get login history for current user
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Login history entries
 */
export async function getLoginHistory(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.limit) params.append('limit', options.limit);
    if (options.skip) params.append('skip', options.skip);
    if (options.status) params.append('status', options.status);

    const response = await authAxios.get(`/login-history?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Get login statistics
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Login statistics
 */
export async function getLoginStats(days = 30) {
  try {
    const response = await authAxios.get(`/login-stats?days=${days}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * Check for suspicious activity
 * @returns {Promise<Object>} Security check results
 */
export async function checkSecurityStatus() {
  try {
    const response = await authAxios.get('/security-check');
    return response.data;
  } catch (error) {
    throw error;
  }
}

export default {
  refreshAccessToken,
  logout,
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  getLoginHistory,
  getLoginStats,
  checkSecurityStatus,
};
