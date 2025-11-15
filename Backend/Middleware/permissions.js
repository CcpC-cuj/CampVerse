const Event = require('../Models/Event');

async function requireHostOrCoHost(req, res, next) {
  const userId = req.user.id;
  // SECURITY FIX: Only use req.params.id to prevent authorization bypass
  // For POST /api/events/scan, eventId is in req.body (special case)
  const eventId = req.params.id || req.params.eventId || req.body.eventId;
  
  if (!eventId) {
    return res.status(400).json({ 
      error: 'Event ID is required.',
      debug: { 
        paramsId: req.params.id, 
        paramsEventId: req.params.eventId,
        bodyEventId: req.body.eventId 
      }
    });
  }
  
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    if (
      event.hostUserId.toString() === userId ||
      event.coHosts.map((id) => id.toString()).includes(userId)
    ) {
      return next();
    }
    return res
      .status(403)
      .json({
        error: 'Only host or approved co-host can perform this action.',
      });
  } catch (error) {
    next(error);
  }
}

function requireVerifier(req, res, next) {
  if (
    req.user.roles.includes('verifier') ||
    req.user.roles.includes('platformAdmin')
  )
    return next();
  return res
    .status(403)
    .json({
      error: 'Only verifier or platform admin can perform this action.',
    });
}

function requireAdmin(req, res, next) {
  if (req.user.roles.includes('platformAdmin')) return next();
  return res
    .status(403)
    .json({ error: 'Only platform admin can perform this action.' });
}

function requireInstitution(req, res, next) {
  if (
    req.user.roles.includes('institution') ||
    req.user.roles.includes('platformAdmin')
  )
    return next();
  return res
    .status(403)
    .json({
      error: 'Only institution or platform admin can perform this action.',
    });
}

function requireSelfOrRole(role) {
  return (req, res, next) => {
    if (
      req.user.id === req.params.id ||
      req.user.roles.includes(role) ||
      req.user.roles.includes('platformAdmin')
    )
      return next();
    return res.status(403).json({ error: 'Forbidden: insufficient role.' });
  };
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({ error: 'Forbidden: user not authenticated or missing roles.' });
    }
    
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const hasRole = rolesArray.some(role => req.user.roles.includes(role));
    
    if (hasRole || req.user.roles.includes('platformAdmin')) {
      return next();
    }
    
    return res.status(403).json({ 
      error: `Forbidden: requires one of the following roles: ${rolesArray.join(', ')}` 
    });
  };
}

module.exports = {
  requireHostOrCoHost,
  requireVerifier,
  requireAdmin,
  requireInstitution,
  requireSelfOrRole,
  requireRole,
};
