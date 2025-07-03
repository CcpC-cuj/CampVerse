const mongoose = require('mongoose');

const eventParticipationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['registered', 'waitlisted', 'attended'], required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EventParticipationLog', eventParticipationLogSchema);
