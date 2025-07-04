const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  tags: [String],
  type: { type: String },
  clubName: String,
  logoURL: String,
  bannerURL: String,
  schedule: {
    start: Date,
    end: Date
  },
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isPaid: { type: Boolean, default: false },
  price: { type: Number },
  paymentDetails: {
    upi: String,
    gatewayToken: String
  },
  features: {
    certificateEnabled: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: false }
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', eventSchema);
