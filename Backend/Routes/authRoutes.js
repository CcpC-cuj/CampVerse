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

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public (requires valid refresh token in body)
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Refresh token is required' 
      });
    }
    
    const result = await refreshAccessToken(refreshToken, req);
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    return res.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
      expiresIn: result.expiresIn
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Token refresh failed' 
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
    
    // Mark current session
    const currentToken = req.token;
    // Note: We can't directly compare tokens since refresh tokens are hashed
    // Instead, we could pass session ID in the token or use other methods
    
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

module.exports = router;
