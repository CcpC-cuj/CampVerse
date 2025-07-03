const mongoose = require('mongoose');

const verifierAssignmentSchema = new mongoose.Schema({
  verifierUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  assignedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' }
});

module.exports = mongoose.model('VerifierAssignment', verifierAssignmentSchema);
