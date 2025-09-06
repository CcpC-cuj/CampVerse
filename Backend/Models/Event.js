const mongoose = require('mongoose');

/**
 * Event Schema for CampVerse
 * Includes support for logo/banner images, co-hosts, and co-host requests
 */
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  tags: [String],
  type: { type: String },
  organizer: { type: String, required: true }, // Name of the organizing entity (club, department, society, etc.)
  logoURL: { type: String }, // URL to event logo image
  bannerURL: { type: String }, // URL to event banner image
  location: {
    type: { type: String, enum: ['online', 'offline', 'hybrid'] },
    venue: { type: String }
  },
  capacity: { type: Number }, // Maximum number of participants
  schedule: {
    start: Date,
    end: Date,
  },
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  isPaid: { type: Boolean, default: false },
  price: { type: Number },
  paymentDetails: {
    upi: String,
    gatewayToken: String,
  },
  features: {
    certificateEnabled: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: false },
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Co-hosts for the event
  coHostRequests: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvedAt: { type: Date },
      remarks: { type: String },
    },
  ],
  waitlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Explicit waitlist tracking
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Performance indexes for common queries
eventSchema.index({ institutionId: 1 });
eventSchema.index({ hostUserId: 1 });
eventSchema.index({ coHosts: 1 });
eventSchema.index({ verificationStatus: 1 });
eventSchema.index({ isPaid: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ updatedAt: -1 });
eventSchema.index({ 'schedule.start': 1 });
eventSchema.index({ 'schedule.end': 1 });

// Compound indexes for complex queries
eventSchema.index({ institutionId: 1, verificationStatus: 1 });
eventSchema.index({ hostUserId: 1, verificationStatus: 1 });
eventSchema.index({ institutionId: 1, 'schedule.start': 1 });
eventSchema.index({ verificationStatus: 1, 'schedule.start': 1 });
eventSchema.index({ type: 1, verificationStatus: 1 });
eventSchema.index({ isPaid: 1, verificationStatus: 1 });

// Text search index for event search
eventSchema.index({ 
  title: 'text', 
  description: 'text',
  organizer: 'text',
  tags: 'text'
}, {
  weights: { title: 10, organizer: 5, description: 3, tags: 2 },
  name: 'event_text_search'
});

// Geospatial index if location is added later
// eventSchema.index({ location: '2dsphere' });

// Array indexes for participants and waitlist
eventSchema.index({ participants: 1 });
eventSchema.index({ waitlist: 1 });

// Update timestamp on save
eventSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', eventSchema);
