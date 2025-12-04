const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../Models/Session');
const LoginHistory = require('../Models/LoginHistory');
const { getDeviceInfo } = require('./deviceInfoService');
const { logger } = require('../Middleware/errorHandler');

/**
 * Token Service
 * Handles JWT access tokens and refresh tokens
 * Implements secure token rotation and session management
 */

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';  // 15 minutes for access token
const REFRESH_TOKEN_EXPIRY_DAYS = 7; // 7 days for refresh token

/**
 * Generate access token (short-lived)
 * @param {Object} user - User object with id, roles, name
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      roles: user.roles || ['user'],
      name: user.name,
      email: user.email,
      type: 'access'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'campverse',
      audience: 'campverse-users',
      algorithm: 'HS256'
    }
  );
}

/**
 * Generate token pair (access + refresh) and create session
 * @param {Object} user - User object
 * @param {Object} req - Express request for device info
 * @param {string} authMethod - Authentication method used
 * @returns {Object} { accessToken, refreshToken, session }
 */
async function generateTokenPair(user, req, authMethod = 'email') {
  try {
    // Get device info
    const deviceInfo = await getDeviceInfo(req);
    
    // Generate access token
    const accessToken = generateAccessToken(user);
    
    // Create session with refresh token
    const { session, refreshToken } = await Session.createSession(
      user._id || user.id,
      deviceInfo,
      REFRESH_TOKEN_EXPIRY_DAYS
    );
    
    // Log successful login
    await LoginHistory.logAttempt({
      userId: user._id || user.id,
      status: 'success',
      authMethod,
      deviceInfo,
      sessionId: session._id
    });
    
    return {
      accessToken,
      refreshToken,
      session,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  } catch (error) {
    logger.error('Token generation failed:', error);
    throw new Error('Failed to generate authentication tokens');
  }
}

/**
 * Refresh access token using refresh token
 * Implements token rotation for security
 * @param {string} refreshToken - Current refresh token
 * @param {Object} req - Express request for device info
 * @returns {Object} New token pair or null if invalid
 */
async function refreshAccessToken(refreshToken, req) {
  try {
    // Find session by refresh token
    const session = await Session.findByRefreshToken(refreshToken);
    
    if (!session) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }
    
    if (!session.isValid()) {
      return { success: false, error: 'Session expired' };
    }
    
    const user = session.userId;
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(user);
    
    // Update session last activity
    await session.touch();
    
    // Log token refresh
    const deviceInfo = await getDeviceInfo(req);
    await LoginHistory.logAttempt({
      userId: user._id,
      status: 'success',
      authMethod: 'refresh_token',
      deviceInfo,
      sessionId: session._id
    });
    
    return {
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto
      },
      expiresIn: 15 * 60
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return { success: false, error: 'Token refresh failed' };
  }
}

/**
 * Revoke a specific session (logout from one device)
 * @param {string} sessionId - Session ID to revoke
 * @param {string} userId - User ID for verification
 * @returns {boolean} Success status
 */
async function revokeSession(sessionId, userId) {
  try {
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    await session.revoke('logout');
    return { success: true };
  } catch (error) {
    logger.error('Session revocation failed:', error);
    return { success: false, error: 'Failed to revoke session' };
  }
}

/**
 * Revoke all sessions for user (logout everywhere)
 * @param {string} userId - User ID
 * @param {string} currentSessionId - Optional: keep current session active
 * @returns {Object} Result with count of revoked sessions
 */
async function revokeAllSessions(userId, currentSessionId = null) {
  try {
    let result;
    if (currentSessionId) {
      result = await Session.revokeAllExcept(userId, currentSessionId, 'security');
    } else {
      result = await Session.revokeAll(userId, 'logout');
    }
    
    return { success: true, revokedCount: result.modifiedCount };
  } catch (error) {
    logger.error('Revoke all sessions failed:', error);
    return { success: false, error: 'Failed to revoke sessions' };
  }
}

/**
 * Get all active sessions for user
 * @param {string} userId - User ID
 * @returns {Array} List of active sessions
 */
async function getActiveSessions(userId) {
  try {
    const sessions = await Session.getActiveSessions(userId);
    
    return sessions.map(s => ({
      id: s._id,
      device: s.device,
      browser: s.browser,
      os: s.os,
      location: s.location?.formatted || 'Unknown',
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
      isCurrent: false // Will be set by caller
    }));
  } catch (error) {
    logger.error('Get active sessions failed:', error);
    return [];
  }
}

/**
 * Get login history for user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} Login history entries
 */
async function getLoginHistory(userId, options = {}) {
  try {
    const history = await LoginHistory.getHistory(userId, options);
    
    return history.map(h => ({
      id: h._id,
      status: h.status,
      failReason: h.failReason,
      authMethod: h.authMethod,
      device: h.device,
      browser: h.browser,
      os: h.os,
      location: h.location?.formatted || 'Unknown',
      ipAddress: h.ipAddress,
      timestamp: h.timestamp
    }));
  } catch (error) {
    logger.error('Get login history failed:', error);
    return [];
  }
}

/**
 * Log failed login attempt
 * @param {string} userId - User ID (if known)
 * @param {string} failReason - Reason for failure
 * @param {Object} req - Express request
 * @param {string} authMethod - Auth method attempted
 */
async function logFailedLogin(userId, failReason, req, authMethod = 'email') {
  try {
    const deviceInfo = await getDeviceInfo(req);
    
    await LoginHistory.logAttempt({
      userId,
      status: 'failed',
      failReason,
      authMethod,
      deviceInfo
    });
  } catch (error) {
    logger.error('Failed to log login attempt:', error);
  }
}

/**
 * Check for suspicious login activity
 * @param {string} userId - User ID
 * @returns {Object} Suspicious activity report
 */
async function checkSuspiciousActivity(userId) {
  return LoginHistory.checkSuspiciousActivity(userId);
}

/**
 * Get login statistics
 * @param {string} userId - User ID
 * @param {number} days - Number of days to look back
 * @returns {Object} Login statistics
 */
async function getLoginStats(userId, days = 30) {
  return LoginHistory.getStats(userId, days);
}

/**
 * Verify access token
 * @param {string} token - Access token to verify
 * @returns {Object} Decoded token payload or null
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'campverse',
      audience: 'campverse-users'
    });
    
    if (decoded.type !== 'access') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateTokenPair,
  refreshAccessToken,
  revokeSession,
  revokeAllSessions,
  getActiveSessions,
  getLoginHistory,
  logFailedLogin,
  checkSuspiciousActivity,
  getLoginStats,
  verifyAccessToken,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY_DAYS
};
