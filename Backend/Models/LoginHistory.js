const mongoose = require('mongoose');

/**
 * LoginHistory Schema
 * Tracks all login attempts (successful and failed) for security and auditing
 */
const loginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Login Status
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true,
    index: true
  },
  
  // Failure reason (if failed)
  failReason: {
    type: String,
    enum: [
      'invalid_password',
      'invalid_email',
      'account_locked',
      'account_disabled',
      'email_not_verified',
      'too_many_attempts',
      'invalid_token',
      'expired_token',
      'oauth_error',
      'unknown'
    ],
    default: null
  },
  
  // Auth Method
  authMethod: {
    type: String,
    enum: ['email', 'google', 'github', 'linkedin', 'magic_link', 'refresh_token'],
    default: 'email'
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
  
  // Location Info
  ipAddress: {
    type: String,
    default: ''
  },
  location: {
    city: { type: String, default: '' },
    region: { type: String, default: '' },
    country: { type: String, default: '' },
    countryCode: { type: String, default: '' },
    formatted: { type: String, default: 'Unknown Location' },
    coordinates: {
      lat: { type: Number },
      lon: { type: Number }
    }
  },
  
  // Session reference (for successful logins)
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session'
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We use our own timestamp field
});

// Indexes for efficient queries
loginHistorySchema.index({ userId: 1, timestamp: -1 });
loginHistorySchema.index({ userId: 1, status: 1 });
loginHistorySchema.index({ ipAddress: 1, timestamp: -1 });
loginHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // TTL: 90 days

// Static method: Log a login attempt
loginHistorySchema.statics.logAttempt = async function({
  userId,
  status,
  failReason = null,
  authMethod = 'email',
  deviceInfo = {},
  sessionId = null
}) {
  return this.create({
    userId,
    status,
    failReason,
    authMethod,
    device: deviceInfo.device || 'Unknown Device',
    browser: deviceInfo.browser || 'Unknown Browser',
    os: deviceInfo.os || 'Unknown OS',
    userAgent: deviceInfo.userAgent || '',
    ipAddress: deviceInfo.ipAddress || '',
    location: deviceInfo.location || { formatted: 'Unknown Location' },
    sessionId
  });
};

// Static method: Get login history for user
loginHistorySchema.statics.getHistory = async function(userId, options = {}) {
  const { limit = 50, skip = 0, status = null } = options;
  
  const query = { userId };
  if (status) query.status = status;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method: Get recent failed attempts
loginHistorySchema.statics.getRecentFailedAttempts = async function(userId, minutes = 15) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return this.countDocuments({
    userId,
    status: 'failed',
    timestamp: { $gte: since }
  });
};

// Static method: Get failed attempts by IP
loginHistorySchema.statics.getFailedAttemptsByIP = async function(ipAddress, minutes = 15) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return this.countDocuments({
    ipAddress,
    status: 'failed',
    timestamp: { $gte: since }
  });
};

// Static method: Check for suspicious activity
loginHistorySchema.statics.checkSuspiciousActivity = async function(userId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Get unique locations in last 24 hours
  const recentLogins = await this.find({
    userId,
    status: 'success',
    timestamp: { $gte: oneDayAgo }
  }).select('location.country ipAddress timestamp');
  
  const uniqueCountries = [...new Set(recentLogins.map(l => l.location?.country).filter(Boolean))];
  const uniqueIPs = [...new Set(recentLogins.map(l => l.ipAddress).filter(Boolean))];
  
  return {
    suspicious: uniqueCountries.length > 2 || uniqueIPs.length > 5,
    uniqueCountries,
    uniqueIPs: uniqueIPs.length,
    recentLogins: recentLogins.length
  };
};

// Static method: Get login stats for user
loginHistorySchema.statics.getStats = async function(userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), timestamp: { $gte: since } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = { successful: 0, failed: 0, total: 0 };
  stats.forEach(s => {
    if (s._id === 'success') result.successful = s.count;
    if (s._id === 'failed') result.failed = s.count;
    result.total += s.count;
  });
  
  return result;
};

module.exports = mongoose.model('LoginHistory', loginHistorySchema);
