const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Session Schema
 * Stores active user sessions with refresh tokens for session management
 * Supports: Login History, Active Sessions, Token Refresh
 */
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Refresh token (hashed for security)
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  
  // Device & Browser Info
  device: {
    type: String,
    default: 'Unknown Device'
  },
  browser: {
    type: String,
    default: 'Unknown Browser'
  },
  os: {
    type: String,
    default: 'Unknown OS'
  },
  userAgent: {
    type: String,
    default: ''
  },
  
  // Location Info (from IP)
  ipAddress: {
    type: String,
    default: ''
  },
  location: {
    city: { type: String, default: '' },
    region: { type: String, default: '' },
    country: { type: String, default: '' },
    formatted: { type: String, default: 'Unknown Location' }
  },
  
  // Session Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  
  // Revocation info
  revokedAt: {
    type: Date
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokeReason: {
    type: String,
    enum: ['logout', 'password_change', 'security', 'admin_action', 'expired', 'manual'],
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-delete expired sessions
sessionSchema.index({ refreshToken: 1 });

// Instance method: Check if session is valid
sessionSchema.methods.isValid = function() {
  return this.isActive && this.expiresAt > new Date();
};

// Instance method: Revoke session
sessionSchema.methods.revoke = async function(reason = 'manual', revokedBy = null) {
  this.isActive = false;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  this.revokeReason = reason;
  return this.save();
};

// Instance method: Update last activity
sessionSchema.methods.touch = async function() {
  this.lastActivity = new Date();
  return this.save();
};

// Static method: Create new session with refresh token
// Handles duplicate sessions for same device - replaces existing session
sessionSchema.statics.createSession = async function(userId, deviceInfo, expiresInDays = 7) {
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  
  // Check for existing active session from same device
  // Match by device + browser + OS combination to identify same device
  const existingSession = await this.findOne({
    userId,
    isActive: true,
    device: deviceInfo.device || 'Unknown Device',
    browser: deviceInfo.browser || 'Unknown Browser',
    os: deviceInfo.os || 'Unknown OS'
  });
  
  // If same device already has a session, revoke it first
  if (existingSession) {
    await existingSession.revoke('manual');
  }
  
  const session = await this.create({
    userId,
    refreshToken: hashedToken,
    device: deviceInfo.device || 'Unknown Device',
    browser: deviceInfo.browser || 'Unknown Browser',
    os: deviceInfo.os || 'Unknown OS',
    userAgent: deviceInfo.userAgent || '',
    ipAddress: deviceInfo.ipAddress || '',
    location: deviceInfo.location || { formatted: 'Unknown Location' },
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
  });
  
  // Return unhashed token for client, session for reference
  return { session, refreshToken };
};

// Static method: Find session by refresh token
sessionSchema.statics.findByRefreshToken = async function(refreshToken) {
  const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
  return this.findOne({ 
    refreshToken: hashedToken, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).populate('userId', 'name email roles isVerified profilePhoto');
};

// Static method: Get active sessions for user
sessionSchema.statics.getActiveSessions = async function(userId) {
  return this.find({ 
    userId, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Static method: Revoke all sessions for user (except current)
sessionSchema.statics.revokeAllExcept = async function(userId, currentSessionId, reason = 'security') {
  return this.updateMany(
    { 
      userId, 
      _id: { $ne: currentSessionId },
      isActive: true 
    },
    { 
      isActive: false, 
      revokedAt: new Date(),
      revokeReason: reason 
    }
  );
};

// Static method: Revoke all sessions for user
sessionSchema.statics.revokeAll = async function(userId, reason = 'logout') {
  return this.updateMany(
    { userId, isActive: true },
    { 
      isActive: false, 
      revokedAt: new Date(),
      revokeReason: reason 
    }
  );
};

// Static method: Cleanup expired sessions (run periodically)
sessionSchema.statics.cleanupExpired = async function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } // Delete revoked sessions after 30 days
    ]
  });
};

module.exports = mongoose.model('Session', sessionSchema);
