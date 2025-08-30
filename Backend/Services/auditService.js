/**
 * Comprehensive Audit Service
 * Tracks all sensitive operations and maintains audit trails
 */

const mongoose = require('mongoose');
const { logger } = require('../Middleware/errorHandler');

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  // Core audit fields
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'user_register', 'user_login', 'user_logout', 'user_update', 'user_delete',
      'password_change', 'password_reset', 'email_verify',
      
      // Institution actions
      'institution_create', 'institution_update', 'institution_delete',
      'institution_verify_request', 'institution_verify_approve', 'institution_verify_reject',
      
      // Event actions
      'event_create', 'event_update', 'event_delete', 'event_verify',
      'event_rsvp', 'event_cancel_rsvp', 'event_attend',
      
      // Host actions
      'host_request', 'host_approve', 'host_reject',
      'cohost_nominate', 'cohost_approve', 'cohost_reject',
      
      // Admin actions
      'admin_grant_role', 'admin_revoke_role', 'admin_system_config',
      
      // Security actions
      'login_failed', 'token_expired', 'unauthorized_access',
      'rate_limit_exceeded', 'suspicious_activity',
      
      // Data actions
      'data_export', 'data_import', 'data_backup', 'data_restore'
    ]
  },
  
  // Who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // When the action was performed
  performedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // What resource was affected
  resourceType: {
    type: String,
    required: true,
    enum: ['user', 'institution', 'event', 'certificate', 'system']
  },
  
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Some actions might not have a specific resource
  },
  
  // Request context
  ipAddress: String,
  userAgent: String,
  correlationId: String,
  sessionId: String,
  
  // Action details
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  
  // Data changes (for update operations)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  
  // Result of the action
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    required: true
  },
  
  // Error information (if action failed)
  error: {
    message: String,
    code: String,
    stack: String
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Risk level of the action
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  // Whether this action requires review
  requiresReview: {
    type: Boolean,
    default: false
  },
  
  // Review status
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'flagged', 'dismissed'],
    default: 'approved'
  },
  
  // Reviewer information
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  reviewedAt: Date,
  reviewNotes: String
}, {
  timestamps: true,
  collection: 'audit_logs'
});

// Indexes for efficient querying
auditLogSchema.index({ performedBy: 1, performedAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, performedAt: -1 });
auditLogSchema.index({ action: 1, performedAt: -1 });
auditLogSchema.index({ ipAddress: 1, performedAt: -1 });
auditLogSchema.index({ riskLevel: 1, requiresReview: 1 });
auditLogSchema.index({ correlationId: 1 });
auditLogSchema.index({ performedAt: -1 }); // For time-based queries

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

class AuditService {
  constructor() {
    this.riskLevels = {
      // Low risk actions
      low: [
        'user_login', 'user_logout', 'user_update', 'event_rsvp', 
        'event_cancel_rsvp', 'event_attend'
      ],
      
      // Medium risk actions
      medium: [
        'user_register', 'password_change', 'event_create', 'event_update',
        'institution_verify_request', 'host_request'
      ],
      
      // High risk actions
      high: [
        'user_delete', 'event_delete', 'institution_verify_approve',
        'institution_verify_reject', 'host_approve', 'host_reject',
        'admin_grant_role'
      ],
      
      // Critical risk actions
      critical: [
        'admin_revoke_role', 'admin_system_config', 'data_export',
        'data_import', 'suspicious_activity'
      ]
    };
  }

  /**
   * Log an audit event
   */
  async log(auditData) {
    try {
      // Determine risk level
      const riskLevel = this.determineRiskLevel(auditData.action);
      
      // Determine if review is required
      const requiresReview = riskLevel === 'critical' || 
                           auditData.result === 'failure' ||
                           auditData.action.includes('suspicious');

      const auditEntry = new AuditLog({
        ...auditData,
        riskLevel,
        requiresReview,
        reviewStatus: requiresReview ? 'pending' : 'approved'
      });

      await auditEntry.save();
      
      // Log high-risk actions immediately
      if (riskLevel === 'high' || riskLevel === 'critical') {
        logger.warn('High-risk action logged', {
          action: auditData.action,
          performedBy: auditData.performedBy,
          riskLevel,
          correlationId: auditData.correlationId
        });
      }

      return auditEntry;
    } catch (error) {
      logger.error('Failed to log audit entry:', error);
      // Don't throw error to avoid breaking the main operation
      return null;
    }
  }

  /**
   * Determine risk level based on action
   */
  determineRiskLevel(action) {
    for (const [level, actions] of Object.entries(this.riskLevels)) {
      if (actions.includes(action)) {
        return level;
      }
    }
    return 'low'; // default
  }

  /**
   * Create audit middleware for Express routes
   */
  createMiddleware(action, resourceType) {
    return async (req, res, next) => {
      const originalSend = res.send;
      const startTime = Date.now();

      res.send = function(data) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Determine result based on status code
        let result = 'success';
        if (res.statusCode >= 400 && res.statusCode < 500) {
          result = 'failure';
        } else if (res.statusCode >= 500) {
          result = 'failure';
        }

        // Extract resource ID from params or body
        const resourceId = req.params.id || req.body.id || req.body.eventId || req.body.userId;

        // Log the audit entry
        setImmediate(async () => {
          try {
            await auditService.log({
              action,
              performedBy: req.user?.id || null,
              resourceType,
              resourceId,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              correlationId: req.correlationId,
              sessionId: req.sessionID,
              details: {
                method: req.method,
                url: req.url,
                params: req.params,
                query: req.query,
                body: auditService.sanitizeBody(req.body),
                duration
              },
              result,
              error: result === 'failure' ? {
                message: typeof data === 'string' ? data : JSON.stringify(data),
                code: res.statusCode.toString()
              } : undefined
            });
          } catch (error) {
            logger.error('Audit middleware error:', error);
          }
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Sanitize request body for audit logging
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = [
      'password', 'passwordHash', 'token', 'secret', 'key',
      'currentPassword', 'newPassword', 'confirmPassword'
    ];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Log user authentication events
   */
  async logAuth(action, userId, req, result = 'success', error = null) {
    return await this.log({
      action,
      performedBy: userId,
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId,
      result,
      error: error ? {
        message: error.message,
        code: error.code || 'AUTH_ERROR'
      } : undefined,
      details: {
        method: req.method,
        url: req.url
      }
    });
  }

  /**
   * Log data changes with before/after comparison
   */
  async logDataChange(action, userId, resourceType, resourceId, beforeData, afterData, req) {
    const changes = this.calculateChanges(beforeData, afterData);
    
    return await this.log({
      action,
      performedBy: userId,
      resourceType,
      resourceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId,
      changes: {
        before: beforeData,
        after: afterData
      },
      details: {
        changedFields: Object.keys(changes),
        changeCount: Object.keys(changes).length
      },
      result: 'success'
    });
  }

  /**
   * Calculate changes between two objects
   */
  calculateChanges(before, after) {
    const changes = {};
    
    if (!before || !after) return changes;

    // Check for changed fields
    for (const key in after) {
      if (before[key] !== after[key]) {
        changes[key] = {
          from: before[key],
          to: after[key]
        };
      }
    }

    // Check for removed fields
    for (const key in before) {
      if (!(key in after)) {
        changes[key] = {
          from: before[key],
          to: null
        };
      }
    }

    return changes;
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = { performedAt: -1 }
    } = options;

    const query = {};

    // Apply filters
    if (filters.userId) query.performedBy = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.resourceType) query.resourceType = filters.resourceType;
    if (filters.resourceId) query.resourceId = filters.resourceId;
    if (filters.riskLevel) query.riskLevel = filters.riskLevel;
    if (filters.result) query.result = filters.result;
    if (filters.requiresReview !== undefined) query.requiresReview = filters.requiresReview;

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.performedAt = {};
      if (filters.startDate) query.performedAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.performedAt.$lte = new Date(filters.endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('performedBy', 'name email')
        .populate('reviewedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(timeframe = '7d') {
    const startDate = new Date();
    
    switch (timeframe) {
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    const stats = await AuditLog.aggregate([
      { $match: { performedAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
          },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$result', 'failure'] }, 1, 0] }
          },
          highRiskActions: {
            $sum: { $cond: [{ $in: ['$riskLevel', ['high', 'critical']] }, 1, 0] }
          },
          pendingReviews: {
            $sum: { $cond: [{ $eq: ['$reviewStatus', 'pending'] }, 1, 0] }
          }
        }
      }
    ]);

    const actionBreakdown = await AuditLog.aggregate([
      { $match: { performedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const riskBreakdown = await AuditLog.aggregate([
      { $match: { performedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    return {
      summary: stats[0] || {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        highRiskActions: 0,
        pendingReviews: 0
      },
      topActions: actionBreakdown,
      riskDistribution: riskBreakdown,
      timeframe
    };
  }

  /**
   * Flag suspicious activity
   */
  async flagSuspiciousActivity(userId, reason, details, req) {
    return await this.log({
      action: 'suspicious_activity',
      performedBy: userId,
      resourceType: 'user',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId,
      details: {
        reason,
        ...details
      },
      result: 'success',
      riskLevel: 'critical',
      requiresReview: true
    });
  }

  /**
   * Review audit entry
   */
  async reviewAuditEntry(auditId, reviewerId, status, notes) {
    const auditEntry = await AuditLog.findById(auditId);
    if (!auditEntry) {
      throw new Error('Audit entry not found');
    }

    auditEntry.reviewStatus = status;
    auditEntry.reviewedBy = reviewerId;
    auditEntry.reviewedAt = new Date();
    auditEntry.reviewNotes = notes;

    await auditEntry.save();

    // Log the review action
    await this.log({
      action: 'audit_review',
      performedBy: reviewerId,
      resourceType: 'system',
      resourceId: auditId,
      details: {
        originalAction: auditEntry.action,
        reviewStatus: status,
        notes
      },
      result: 'success'
    });

    return auditEntry;
  }
}

// Create singleton instance
const auditService = new AuditService();

module.exports = {
  auditService,
  AuditLog
};