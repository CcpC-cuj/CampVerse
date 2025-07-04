const mongoose = require('mongoose');

const eventVerificationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  verifierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['approved', 'rejected', 'pending'], default: 'pending' },
  remarks: String,
  verifiedAt: Date
});

module.exports = mongoose.model('EventVerification', eventVerificationSchema);
