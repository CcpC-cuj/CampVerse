const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Session = require('../Models/Session');
const LoginHistory = require('../Models/LoginHistory');
const { getDeviceInfo } = require('./deviceInfoService');
const { logger } = require('../Middleware/errorHandler');
const { cacheService } = require('./cacheService');

/**
 * Token Service
 * Handles JWT access tokens and refresh tokens
 * Implements secure token rotation and session management
 */

// Token configuration
const ACCESS_TOKEN_EXPIRY = '1h';  // 1 hour for access token (Extended from 15m)
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days for refresh token (Extended from 7d)

/**
 * Generate access token (short-lived)
 * @param {Object} user - User object with id, roles, name
 * @param {string} sessionId - Session ID to include in token for blacklist checking
 * @returns {string} JWT access token
 */
function generateAccessToken(user, sessionId = null) {
  return jwt.sign(
    {
      id: user._id || user.id,
      roles: user.roles || ['user'],
      name: user.name,
      email: user.email,
      sessionId: sessionId, // Include sessionId for session-based revocation
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
    
    // Create session with refresh token first to get session ID
    const { session, refreshToken } = await Session.createSession(
      user._id || user.id,
      deviceInfo,
      REFRESH_TOKEN_EXPIRY_DAYS
    );
    
    // Generate access token with session ID for revocation checking
    const accessToken = generateAccessToken(user, session._id.toString());
    
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
      expiresIn: 60 * 60 // 1 hour in seconds
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
      logger.warn('Refresh failed: Session not found for token');
      return { success: false, error: 'Invalid or expired refresh token' };
    }
    
    if (!session.isValid()) {
      logger.warn('Refresh failed: Session is invalid or expired', { id: session._id, expiresAt: session.expiresAt });
      return { success: false, error: 'Session expired' };
    }
    
    const user = session.userId;
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Generate new access token with session ID for revocation checking
    const accessToken = generateAccessToken(user, session._id.toString());
    
    // Implement Token Rotation: Generate a new refresh token for this session
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const hashedNewToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    
    // Update session with new hashed token and set new expiry
    session.refreshToken = hashedNewToken;
    session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    await session.touch();
    
    // Do not log refresh token rotations as login history entries
    
    return {
      success: true,
      accessToken,
      newRefreshToken, // Return unhashed token for cookie setting
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isVerified: user.isVerified,
        profilePhoto: user.profilePhoto
      },
      expiresIn: 60 * 60
    };
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return { success: false, error: 'Token refresh failed' };
  }
}

/**
 * Revoke a specific session (logout from one device)
 * Also blacklists associated access tokens to force immediate logout
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
    
    // Blacklist all tokens for this session to force immediate logout
    // Store session ID in blacklist with 15 min TTL (same as access token expiry)
    await cacheService.set(`session:blacklist:${sessionId}`, true, 15 * 60);
    
    // Also invalidate user's cache to reflect session changes
    await cacheService.invalidateUser(userId);
    
    return { success: true };
  } catch (error) {
    logger.error('Session revocation failed:', error);
    return { success: false, error: 'Failed to revoke session' };
  }
}

/**
 * Revoke all sessions for user (logout everywhere)
 * Also blacklists all associated access tokens to force immediate logout
 * @param {string} userId - User ID
 * @param {string} currentSessionId - Optional: keep current session active
 * @returns {Object} Result with count of revoked sessions
 */
async function revokeAllSessions(userId, currentSessionId = null) {
  try {
    // Get all active sessions before revoking to blacklist them
    const activeSessions = await Session.find({ 
      userId, 
      isActive: true,
      ...(currentSessionId ? { _id: { $ne: currentSessionId } } : {})
    });
    
    let result;
    if (currentSessionId) {
      result = await Session.revokeAllExcept(userId, currentSessionId, 'security');
    } else {
      result = await Session.revokeAll(userId, 'logout');
    }
    
    // Blacklist all revoked sessions to force immediate logout
    for (const session of activeSessions) {
      await cacheService.set(`session:blacklist:${session._id}`, true, 15 * 60);
    }
    
    // Invalidate user's cache to reflect session changes
    await cacheService.invalidateUser(userId);
    
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
