const mongoose = require('mongoose');

/**
 * Event Schema for CampVerse
 * Includes support for logo/banner images, co-hosts, and co-host requests
 */
const eventSchema = new mongoose.Schema({
  requirements: [String],
  socialLinks: {
    website: { type: String },
    linkedin: { type: String }
  },
  coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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
  hostUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  features: {
    certificateEnabled: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: false },
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  tags: [String],
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
  type: { type: String },
  date: { type: Date, required: true },
  organizer: {
    name: { type: String, required: true },
    type: { type: String, enum: ['club', 'institution', 'person'], required: true },
    logoURL: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
  },
  logoURL: { type: String },
  bannerURL: { type: String, required: true },
  location: {
    type: { type: String, enum: ['online', 'offline'], required: true },
    venue: { type: String }, // For offline
    link: { type: String },  // For online
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantCount: { type: Number, default: 0 },
  capacity: { type: Number },
  waitlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sessions: [
    {
      title: { type: String, required: true },
      time: { type: String, required: true },
      speaker: { type: String, required: true },
    }
  ],
  about: { type: String },
  isPaid: { type: Boolean, default: false },
  price: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


// Performance indexes for common queries
eventSchema.index({ 'organizer.type': 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ updatedAt: -1 });
eventSchema.index({ date: 1 });

// Text search index for event search (exclude organizer, use organizer.name)
eventSchema.index({ 
  title: 'text', 
  about: 'text',
  'organizer.name': 'text',
  tags: 'text'
}, {
  weights: { title: 10, 'organizer.name': 5, about: 3, tags: 2 },
  name: 'event_text_search'
});

// Array indexes for participants
eventSchema.index({ participants: 1 });

// Update timestamp on save
eventSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', eventSchema);
