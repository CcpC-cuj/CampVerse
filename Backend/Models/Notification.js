const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'system',
      'feedback',
      'chat',
      'approval',
      'host_request',
      'host_status_update',
      'institution_request',
      'event_reminder',
      'rsvp',
      'attendance',
      'cohost',
      'event_verification',
    ],
    required: true,
  },
  message: { type: String, required: true },
  data: { type: Object, default: {} },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);
