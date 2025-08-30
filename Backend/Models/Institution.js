const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['college', 'university', 'org', 'temporary'],
    required: true,
  },
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
  },
  emailDomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    sparse: true,
  },
  website: { type: String, default: '' },
  phone: { type: String, default: '' },
  info: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  isTemporary: { type: Boolean, default: false },
  hostedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Track verification workflow
  verificationRequested: { type: Boolean, default: false },
  verificationRequests: [
    {
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      institutionName: { type: String, required: true },
      officialEmail: { type: String, default: '' },
      website: { type: String, default: '' },
      phone: { type: String, default: '' },
      type: { type: String, required: true },
      info: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: { type: Date },
      verifierRemarks: { type: String, default: '' },
    },
  ],
  // Enhanced verification tracking
  verificationHistory: [
    {
      action: {
        type: String,
        enum: ['requested', 'approved', 'rejected', 'updated'],
        required: true,
      },
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      performedAt: { type: Date, default: Date.now },
      remarks: { type: String, default: '' },
      previousData: { type: mongoose.Schema.Types.Mixed },
      newData: { type: mongoose.Schema.Types.Mixed },
    },
  ],
  // Public dashboard settings
  publicDashboard: {
    enabled: { type: Boolean, default: false },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    requestedAt: { type: Date },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: { type: Date },
  },
});

// Performance indexes for common queries
institutionSchema.index({ emailDomain: 1 }, { unique: true });
institutionSchema.index({ isVerified: 1 });
institutionSchema.index({ verificationRequested: 1 });
institutionSchema.index({ type: 1 });
institutionSchema.index({ isTemporary: 1 });
institutionSchema.index({ createdAt: -1 });
institutionSchema.index({ updatedAt: -1 });

// Compound indexes for complex queries
institutionSchema.index({ isVerified: 1, verificationRequested: 1 });
institutionSchema.index({ type: 1, isVerified: 1 });
institutionSchema.index({ emailDomain: 1, isVerified: 1 });

// Text search index for institution search
institutionSchema.index({ 
  name: 'text', 
  emailDomain: 'text',
  info: 'text'
}, {
  weights: { name: 10, emailDomain: 5, info: 1 },
  name: 'institution_text_search'
});

// Sparse indexes for optional fields
institutionSchema.index({ website: 1 }, { sparse: true });
institutionSchema.index({ 'publicDashboard.enabled': 1 }, { sparse: true });

// Update the updatedAt field before saving
institutionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Institution', institutionSchema);
