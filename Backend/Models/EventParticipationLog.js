const mongoose = require('mongoose');

/**
 * EventParticipationLog Schema for CampVerse
 * Includes payment info, attendance timestamp, and QR token for ticketing
 */
const eventParticipationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  status: { type: String, enum: ['registered', 'waitlisted', 'attended'], required: true },
  timestamp: { type: Date, default: Date.now },
  paymentType: { type: String, enum: ['free', 'paid'], default: 'free' },
  paymentStatus: { type: String, enum: ['success', 'pending', 'failed'], default: 'success' },
  attendanceTimestamp: { type: Date },
  qrToken: { type: String }, // Secure token for QR code validation
});

module.exports = mongoose.model('EventParticipationLog', eventParticipationLogSchema);
