const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ticketId: {
    type: String,
    unique: true,
    required: true,
  },
  topic: {
    type: String,
    required: true,
    enum: ['general', 'technical', 'billing', 'events', 'account', 'other'],
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  attachment: {
    filename: String,
    url: String,
    mimetype: String,
    size: Number,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'],
    default: 'open',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  adminNotes: [
    {
      note: String,
      addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      addedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: Date,
  closedAt: Date,
});

// Generate unique ticket ID
supportTicketSchema.pre('save', function (next) {
  if (this.isNew) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.ticketId = `TKT-${timestamp}-${random}`;
  }
  this.updatedAt = new Date();
  next();
});

// Index for efficient queries
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ ticketId: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
