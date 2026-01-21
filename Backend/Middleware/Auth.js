require('dotenv').config();

const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { logger } = require('./errorHandler');

// Redis client for token blacklisting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

(async () => {
  try {
    if (!redisClient.isOpen) await redisClient.connect();
  } catch (err) {
    logger.error('Redis connection failed for auth:', err);
  }
})();

/**
 * Middleware to authenticate JWT token from Authorization header.
 * Attaches user info to req.user if valid.
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    // Check if token is blacklisted (with Redis error handling)
    let isBlacklisted = false;
    try {
      if (redisClient && redisClient.isOpen) {
        const blacklistEntry = await redisClient.get(`blacklist:${token}`);
        isBlacklisted = !!blacklistEntry;
      }
    } catch (redisError) {
      logger.error('Redis blacklist check failed:', redisError);
      // Fail open: continue if Redis is down (security vs availability trade-off)
      // Change to 'return res.status(503)...' to fail closed for higher security
    }
    
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked.' });
    }

    // Verify token with enhanced options
    jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Only allow HS256 algorithm
      issuer: 'campverse',
      audience: 'campverse-users',
      clockTolerance: 30, // Allow 30 seconds clock skew
    }, async (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token expired.' });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({ error: 'Invalid token.' });
        } else {
          return res.status(401).json({ error: 'Token verification failed.' });
        }
      }

      // Check if user still exists and is active
      if (!user || !user.id) {
        return res.status(401).json({ error: 'Invalid token payload.' });
      }

      // Check if session is blacklisted (for immediate logout when session is revoked)
      if (user.sessionId) {
        try {
          if (redisClient && redisClient.isOpen) {
            const sessionBlacklisted = await redisClient.get(`campverse:session:blacklist:${user.sessionId}`);
            if (sessionBlacklisted) {
              return res.status(401).json({ error: 'Session has been terminated.' });
            }
          }
        } catch (redisError) {
          logger.error('Redis session blacklist check failed:', redisError);
        }
      }

      // Validate user still exists in database and is active
      try {
        const User = require('../Models/User');
        const dbUser = await User.findById(user.id).select('_id roles isVerified name email institutionId');
        
        if (!dbUser) {
          return res.status(401).json({ error: 'User no longer exists.' });
        }
        
        // Update user object with latest data from database
        user.roles = dbUser.roles;
        user.isVerified = dbUser.isVerified;
        user.name = dbUser.name;
        user.email = dbUser.email;
        user.institutionId = dbUser.institutionId;
      } catch (dbError) {
        logger.error('User validation error:', dbError);
        return res.status(500).json({ error: 'Authentication validation failed.' });
      }

      req.user = user;
      req.token = token; // Store token for potential blacklisting
      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

/**
 * Middleware to require a specific user role or one of multiple roles.
 * Usage: requireRole('platformAdmin') or requireRole(['verifier', 'platformAdmin'])
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ error: 'Forbidden: insufficient role.' });
    }

    // Handle both single role and array of roles
    const requiredRoles = Array.isArray(role) ? role : [role];
    const hasRequiredRole = requiredRoles.some(r => req.user.roles.includes(r));

    if (!hasRequiredRole) {
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

/**
 * Middleware to check if user has permission for specific action
 * Usage: requirePermission('event', 'create')
 */
function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions.' });
    }

    // Define permission matrix
    const permissions = {
      platformAdmin: ['*'], // Platform admin can do everything
      verifier: ['event:verify', 'user:verify', 'institution:verify'],
      host: ['event:create', 'event:update', 'event:delete', 'event:manage'],
      student: ['event:view', 'event:join', 'profile:update']
    };

    const userPermissions = req.user.roles.flatMap(role => permissions[role] || []);
    
    if (userPermissions.includes('*') || userPermissions.includes(`${resource}:${action}`)) {
      return next();
    }

    return res.status(403).json({ error: `Forbidden: insufficient permissions for ${resource}:${action}` });
  };
}

/**
 * Logout function to blacklist token
 */
async function logout(req, res) {
  try {
    const token = req.token;
    if (token) {
      // Add token to blacklist with expiration
      const decoded = jwt.decode(token);
      const exp = decoded.exp || Math.floor(Date.now() / 1000) + 3600; // Default 1 hour
      const ttl = exp - Math.floor(Date.now() / 1000);
      
      if (ttl > 0) {
        await redisClient.setEx(`blacklist:${token}`, ttl, 'revoked');
      }
    }
    
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed.' });
  }
}

/**
 * Middleware that attempts to authenticate user but allows anonymous access.
 * Attaches user to req.user if valid token present.
 */
async function authenticateTokenOptional(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return next();

    // Check blacklist
    try {
      if (redisClient && redisClient.isOpen) {
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) return next();
      }
    } catch (e) {
      logger.error('Redis error in optional auth:', e);
    }

    jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'campverse',
      audience: 'campverse-users',
      clockTolerance: 30,
    }, async (err, user) => {
      if (err || !user?.id) return next();

      // Check session
      try {
        if (user.sessionId && redisClient && redisClient.isOpen) {
          const sessionBlacklisted = await redisClient.get(`campverse:session:blacklist:${user.sessionId}`);
          if (sessionBlacklisted) return next();
        }
      } catch (e) {
        logger.error('Redis error in optional auth session check:', e);
      }

      // Check user in DB
      try {
        const User = require('../Models/User');
        const dbUser = await User.findById(user.id).select('_id roles isVerified name email institutionId');
        if (dbUser) {
          req.user = {
            id: dbUser._id,
            roles: dbUser.roles,
            isVerified: dbUser.isVerified,
            name: dbUser.name,
            email: dbUser.email,
            institutionId: dbUser.institutionId
          };
        }
      } catch (e) {
        // Ignore DB errors in optional auth
      }
      next();
    });
  } catch (err) {
    next();
  }
}

/**
 * Middleware to check if user is active and not suspended
 */
function requireActiveUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // Check if user account is active
  if (req.user.accountStatus === 'suspended') {
    return res.status(403).json({ error: 'Account suspended.' });
  }

  if (req.user.accountStatus === 'deleted') {
    return res.status(403).json({ error: 'Account deleted.' });
  }

  next();
}

module.exports = {
  authenticateToken,
  authenticateTokenOptional,
  requireRole,
  requireSelfOrRole,
  requirePermission,
  requireActiveUser,
  logout,
};
