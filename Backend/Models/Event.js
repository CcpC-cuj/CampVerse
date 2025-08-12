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

eventSchema.index({ institutionId: 1 });
eventSchema.index({ hostUserId: 1 });
eventSchema.index({ coHosts: 1 });

module.exports = mongoose.model('Event', eventSchema);
