const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  type: {
    type: String,
    enum: ['participant', 'winner', 'organizer', 'co-organizer'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'ready', 'failed'],
    default: 'pending',
    // 'pending': Certificate generation not yet started
    // 'ready': Certificate assets validated and ready to render on-demand
    // 'failed': Certificate generation validation failed
  },
  certificateURL: {
    type: String,
    // DEPRECATED: Certificates are no longer stored in cloud storage
    // Instead, they are rendered on-demand via GET /api/certificate-management/events/:eventId/render/:userId
    // This field is kept for backward compatibility but should not be used for new certificates
  },
  certificateData: {
    // Data sent to ML API for certificate generation
    userName: String,
    userEmail: String,
    eventTitle: String,
    eventDescription: String,
    eventDate: Date,
    eventLocation: String,
    organizerName: String,
    institutionName: String,
    certificateType: String,
    // Additional fields for ML processing
    userSkills: [String],
    eventTags: [String],
    attendanceDate: Date,
    qrCode: String, // For certificate verification
  },
  mlApiResponse: {
    // Response from ML certificate generation API
    requestId: String,
    generationStatus: String,
    errorMessage: String,
    generatedAt: Date,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient queries
certificateSchema.index({ userId: 1, eventId: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ issuedAt: -1 });

// Update timestamp on save
certificateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
