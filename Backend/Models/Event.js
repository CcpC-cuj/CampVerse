const mongoose = require('mongoose');

/**
 * Event Schema for CampVerse
 * Includes support for logo/banner images, co-hosts, and co-host requests
 */
// Event schema for CampVerse. Participants are tracked via EventParticipationLog only.
const eventSchema = new mongoose.Schema({
  audienceType: { type: String, enum: ['institution', 'public'], default: 'public' },
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
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  rejectedAt: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: {
    type: Date,
  },
  features: {
    certificateEnabled: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: false },
  },
  certificateSettings: {
    certificateType: { type: String, enum: ['participation', 'achievement'], default: 'participation' },
    awardText: { type: String },
    leftSignatory: {
      name: { type: String },
      title: { type: String },
    },
    rightSignatory: {
      name: { type: String },
      title: { type: String },
    },
    uploadedAssets: [
      {
        originalName: { type: String },
        assetType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      }
    ],
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  tags: [String],
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
  type: { type: String },
  date: { type: Date, required: true },
  organizationName: { type: String },
  logoURL: { type: String },
  bannerURL: { type: String }, // Made optional - not all events may have a banner
  location: {
    type: { type: String, enum: ['online', 'offline', 'hybrid'], required: true },
    venue: { type: String }, // For offline and hybrid
    link: { type: String },  // For online and hybrid
  },
  // participants and participantCount removed; use EventParticipationLog for tracking
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
  // createdAt and updatedAt handled by timestamps option
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
  organizationName: 'text',
  tags: 'text'
}, {
  weights: { title: 10, organizationName: 5, about: 3, tags: 2 },
  name: 'event_text_search'
});

// Removed participants index; not needed when using EventParticipationLog

// Update timestamp on save


// Export with timestamps enabled
module.exports = mongoose.model('Event', new mongoose.Schema(eventSchema.obj, { timestamps: true }));
