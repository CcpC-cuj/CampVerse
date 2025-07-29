const Event = require('../Models/Event');

function requireHostOrCoHost(req, res, next) {
  const userId = req.user.id;
  const eventId = req.body.eventId || req.params.id;
  Event.findById(eventId).then(event => {
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.hostUserId.toString() === userId || event.coHosts.map(id => id.toString()).includes(userId)) {
      return next();
    }
    return res.status(403).json({ error: 'Only host or approved co-host can perform this action.' });
  }).catch(next);
}

function requireVerifier(req, res, next) {
  if (req.user.roles.includes('verifier') || req.user.roles.includes('platformAdmin')) return next();
  return res.status(403).json({ error: 'Only verifier or platform admin can perform this action.' });
}

function requireAdmin(req, res, next) {
  if (req.user.roles.includes('platformAdmin')) return next();
  return res.status(403).json({ error: 'Only platform admin can perform this action.' });
}

function requireInstitution(req, res, next) {
  if (req.user.roles.includes('institution') || req.user.roles.includes('platformAdmin')) return next();
  return res.status(403).json({ error: 'Only institution or platform admin can perform this action.' });
}

function requireSelfOrRole(role) {
  return (req, res, next) => {
    if (req.user.id === req.params.id || req.user.roles.includes(role) || req.user.roles.includes('platformAdmin')) return next();
    return res.status(403).json({ error: 'Forbidden: insufficient role.' });
  };
}

module.exports = {
  requireHostOrCoHost,
  requireVerifier,
  requireAdmin,
  requireInstitution,
  requireSelfOrRole
}; 