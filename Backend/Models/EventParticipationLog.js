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
  registeredAt: { type: Date, default: Date.now },
  paymentType: { type: String, enum: ['free', 'paid'], default: 'free' },
  paymentStatus: {
    type: String,
    enum: ['success', 'pending', 'failed'],
    default: 'success',
  },
  attendanceTimestamp: { type: Date },
  qrToken: { type: String }, // Secure token for QR code validation (legacy field)
  attendanceMarkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Host/co-host who scanned
  attendanceMarkedAt: { type: Date }, // When attendance was marked (scan time)
  
  // Enhanced QR Code System
  qrCode: {
    token: { type: String, unique: true, sparse: true }, // Unique QR token
    imageUrl: { type: String }, // Cloud storage URL for QR image
    generatedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }, // Event end + 2 hours
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Host who scanned
  }
});

// Unique index to prevent duplicate registrations
eventParticipationLogSchema.index({ userId: 1, eventId: 1 }, { unique: true });

// Performance indexes for common queries
eventParticipationLogSchema.index({ eventId: 1, status: 1 }); // For capacity checks
eventParticipationLogSchema.index({ userId: 1, status: 1 }); // For user's registrations
eventParticipationLogSchema.index({ qrToken: 1 }, { sparse: true }); // For QR scanning (legacy)
eventParticipationLogSchema.index({ 'qrCode.expiresAt': 1 }, { sparse: true }); // For cleanup
eventParticipationLogSchema.index({ eventId: 1, status: 1, userId: 1 }); // Compound for analytics

module.exports = mongoose.model(
  'EventParticipationLog',
  eventParticipationLogSchema,
);
