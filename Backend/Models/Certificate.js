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
    enum: ['pending', 'generated', 'failed'],
    default: 'pending',
  },
  certificateURL: {
    type: String,
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
