import api from './axiosInstance';

/**
 * Refresh access token using HttpOnly cookie
 * The refresh token is automatically sent by the browser as a cookie
 * 
 * @returns {Promise<Object>} New access token and user data
 */
export async function refreshAccessToken() {
  const response = await api.post('/api/auth/refresh', {});
  return response.data;
}

/**
 * Logout - clears the HttpOnly cookie on server side
 * @returns {Promise<Object>} Success status
 */
export async function logout() {
  const response = await api.post('/api/auth/logout');
  return response.data;
}

/**
 * Get all active sessions for current user
 * @returns {Promise<Object>} List of active sessions
 */
export async function getActiveSessions() {
  const response = await api.get('/api/auth/sessions');
  return response.data;
}

/**
 * Revoke a specific session
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<Object>} Success status
 */
export async function revokeSession(sessionId) {
  const response = await api.delete(`/api/auth/sessions/${sessionId}`);
  return response.data;
}

/**
 * Revoke all sessions (logout everywhere)
 * @param {boolean} keepCurrent - Keep current session active
 * @returns {Promise<Object>} Number of revoked sessions
 */
export async function revokeAllSessions(keepCurrent = false) {
  const response = await api.delete(`/api/auth/sessions?keepCurrent=${keepCurrent}`);
  return response.data;
}

/**
 * Get login history for current user
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Login history entries
 */
export async function getLoginHistory(options = {}) {
  const response = await api.get('/api/auth/login-history', { params: options });
  return response.data;
}

/**
 * Get login statistics
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Login statistics
 */
export async function getLoginStats(days = 30) {
  const response = await api.get('/api/auth/login-stats', { params: { days } });
  return response.data;
}

/**
 * Check for suspicious activity
 * @returns {Promise<Object>} Security check results
 */
export async function checkSecurityStatus() {
  const response = await api.get('/api/auth/security-check');
  return response.data;
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
