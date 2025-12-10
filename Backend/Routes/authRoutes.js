const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../Middleware/Auth');
const {
  refreshAccessToken,
  revokeSession,
  revokeAllSessions,
  getActiveSessions,
  getLoginHistory,
  getLoginStats,
  checkSuspiciousActivity
} = require('../Services/tokenService');

// Environment check for cookie settings
const isProduction = process.env.NODE_ENV === 'production';

// Cookie configuration - production vs development
// CRITICAL: secure must be false on localhost (HTTP), true on Render (HTTPS)
// CRITICAL: sameSite must be 'lax' on localhost, 'none' for cross-origin (Vercel -> Render)
const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,                              // Prevents JavaScript access (XSS protection)
  secure: isProduction,                        // true on Render (HTTPS), false on localhost (HTTP)
  sameSite: isProduction ? 'none' : 'lax',     // 'none' for cross-origin, 'lax' for same-origin
  maxAge: 7 * 24 * 60 * 60 * 1000,            // 7 days in milliseconds
  path: '/',                                   // Cookie available for all paths
});

/**
 * Helper to set refresh token as HttpOnly cookie
 */
function setRefreshTokenCookie(res, refreshToken) {
  const options = getRefreshTokenCookieOptions();
  console.log('🍪 Setting refresh token cookie with options:', {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    maxAge: options.maxAge,
    isProduction,
    nodeEnv: process.env.NODE_ENV
  });
  res.cookie('refreshToken', refreshToken, options);
}

/**
 * Helper to clear refresh token cookie
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
}

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token from HttpOnly cookie
 * @access Public (requires valid refresh token in cookie)
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from HttpOnly cookie (browser sends it automatically)
    const refreshToken = req.cookies?.refreshToken;
    
    console.log('🔄 Refresh token request received');
    console.log('🍪 Cookie present:', !!refreshToken);
    console.log('🍪 All cookies:', Object.keys(req.cookies || {}));
    
    if (!refreshToken) {
      console.log('❌ No refresh token in cookies');
      return res.status(401).json({ 
        success: false, 
        error: 'No refresh token found. Please login again.' 
      });
    }
    
    const result = await refreshAccessToken(refreshToken, req);
    
    if (!result.success) {
      console.log('❌ Refresh failed:', result.error);
      // Clear invalid cookie
      clearRefreshTokenCookie(res);
      return res.status(401).json(result);
    }
    
    console.log('✅ Token refresh successful');
    
    // If token rotation provides a new refresh token, update the cookie
    if (result.newRefreshToken) {
      setRefreshTokenCookie(res, result.newRefreshToken);
    }
    
    return res.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    clearRefreshTokenCookie(res);
    return res.status(500).json({ 
      success: false, 
      error: 'Token refresh failed' 
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user and clear refresh token cookie
 * @access Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Clear the refresh token cookie
    clearRefreshTokenCookie(res);
    
    // Optionally revoke the session on the server
    if (req.user?.sessionId) {
      try {
        await revokeSession(req.user.sessionId, req.user.id);
      } catch (e) {
        // Continue even if session revocation fails
        console.error('Session revocation error:', e);
      }
    }
    
    console.log('✅ User logged out, cookie cleared');
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear the cookie even on error
    clearRefreshTokenCookie(res);
    return res.status(500).json({ 
      success: false, 
      error: 'Logout failed' 
    });
  }
});

/**
 * @route GET /api/auth/sessions
 * @desc Get all active sessions for current user
 * @access Private
 */
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const sessions = await getActiveSessions(req.user.id);
    
    return res.json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get sessions' 
    });
  }
});

/**
 * @route DELETE /api/auth/sessions/:sessionId
 * @desc Revoke a specific session (logout from device)
 * @access Private
 */
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await revokeSession(sessionId, req.user.id);
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    return res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to revoke session' 
    });
  }
});

/**
 * @route DELETE /api/auth/sessions
 * @desc Revoke all sessions (logout everywhere)
 * @access Private
 */
router.delete('/sessions', authenticateToken, async (req, res) => {
  try {
    const { keepCurrent } = req.query;
    const currentSessionId = keepCurrent === 'true' ? req.sessionId : null;
    
    const result = await revokeAllSessions(req.user.id, currentSessionId);
    
    // If not keeping current session, clear the cookie too
    if (!currentSessionId) {
      clearRefreshTokenCookie(res);
    }
    
    return res.json({
      success: true,
      message: `Revoked ${result.revokedCount} session(s)`,
      revokedCount: result.revokedCount
    });
  } catch (error) {
    console.error('Revoke all sessions error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to revoke sessions' 
    });
  }
});

/**
 * @route GET /api/auth/login-history
 * @desc Get login history for current user
 * @access Private
 */
router.get('/login-history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, skip = 0, status } = req.query;
    
    const history = await getLoginHistory(req.user.id, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      status: status || null
    });
    
    return res.json({
      success: true,
      history,
      count: history.length
    });
  } catch (error) {
    console.error('Get login history error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get login history' 
    });
  }
});

/**
 * @route GET /api/auth/login-stats
 * @desc Get login statistics for current user
 * @access Private
 */
router.get('/login-stats', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await getLoginStats(req.user.id, parseInt(days));
    
    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get login stats error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to get login stats' 
    });
  }
});

/**
 * @route GET /api/auth/security-check
 * @desc Check for suspicious login activity
 * @access Private
 */
router.get('/security-check', authenticateToken, async (req, res) => {
  try {
    const report = await checkSuspiciousActivity(req.user.id);
    
    return res.json({
      success: true,
      ...report
    });
  } catch (error) {
    console.error('Security check error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check security status' 
    });
  }
});

// Export cookie helpers for use in User controller
module.exports = router;
module.exports.setRefreshTokenCookie = setRefreshTokenCookie;
module.exports.clearRefreshTokenCookie = clearRefreshTokenCookie;
module.exports.getRefreshTokenCookieOptions = getRefreshTokenCookieOptions;
