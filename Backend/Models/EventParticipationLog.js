const mongoose = require('mongoose');

/**
 * EventParticipationLog Schema for CampVerse
 * Includes payment info, attendance timestamp, and QR token for ticketing
 */
const eventParticipationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  status: {
    type: String,
    enum: ['registered', 'waitlisted', 'attended'],
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  paymentType: { type: String, enum: ['free', 'paid'], default: 'free' },
  paymentStatus: {
    type: String,
    enum: ['success', 'pending', 'failed'],
    default: 'success',
  },
  attendanceTimestamp: { type: Date },
  qrToken: { type: String }, // Secure token for QR code validation
  attendanceMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Host/co-host who scanned
  attendanceMarkedAt: { type: Date }, // When attendance was marked (scan time)
});

eventParticipationLogSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model(
  'EventParticipationLog',
  eventParticipationLogSchema,
);
