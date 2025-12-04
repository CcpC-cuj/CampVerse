import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Create axios instance with interceptors for token refresh
const authAxios = axios.create({
  baseURL: `${API_URL}/api/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
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
 * Refresh access token using refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} New access token and user data
 */
export async function refreshAccessToken(refreshToken) {
  try {
    const response = await authAxios.post('/refresh', { refreshToken });
    return response.data;
  } catch (error) {
    console.error('Token refresh failed:', error);
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
    console.error('Failed to get sessions:', error);
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
    console.error('Failed to revoke session:', error);
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
    console.error('Failed to revoke all sessions:', error);
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
    console.error('Failed to get login history:', error);
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
    console.error('Failed to get login stats:', error);
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
    console.error('Security check failed:', error);
    throw error;
  }
}

export default {
  refreshAccessToken,
  getActiveSessions,
  revokeSession,
  revokeAllSessions,
  getLoginHistory,
  getLoginStats,
  checkSecurityStatus,
};
