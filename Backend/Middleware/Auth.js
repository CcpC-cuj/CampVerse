require('dotenv').config();

const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT token from Authorization header.
 * Attaches user info to req.user if valid.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

/**
 * Middleware to require a specific user role.
 * Usage: requireRole('platformAdmin')
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles || !req.user.roles.includes(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role.' });
    }
    next();
  };
}

/**
 * Middleware to allow if user is self or has one of the specified roles.
 * Usage: requireSelfOrRole(['platformAdmin', 'host'])
 */
function requireSelfOrRole(roles = []) {
  return (req, res, next) => {
    if (
      req.user &&
      (req.user.id === req.params.id ||
        roles.some((role) => req.user.roles.includes(role)))
    ) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: not allowed.' });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  requireSelfOrRole,
};
