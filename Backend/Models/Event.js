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
      token: { type: String },
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
    // Template selection
    selectedTemplateId: { type: String },
    certificateType: { type: String, enum: ['participation', 'achievement'], default: 'participation' },
    
    // Content
    awardText: { type: String },
    
    // Signatories
    leftSignatory: {
      name: { type: String },
      title: { type: String },
    },
    rightSignatory: {
      name: { type: String },
      title: { type: String },
    },
    
    // Uploaded assets (cloud storage URLs)
    uploadedAssets: {
      organizationLogo: { type: String }, // Cloud storage URL
      leftSignature: { type: String },    // Cloud storage URL
      rightSignature: { type: String },   // Cloud storage URL
    },
    
    // Verification status (similar to event verification)
    verificationStatus: {
      type: String,
      enum: ['not_configured', 'pending', 'approved', 'rejected'],
      default: 'not_configured',
    },
    submittedAt: { type: Date },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    specificIssues: [String],
    requestedChanges: [String],
    changesRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changesRequestedAt: { type: Date },
    
    // Generation status
    generationStatus: {
      type: String,
      enum: ['not_generated', 'in_progress', 'completed', 'failed'],
      default: 'not_generated',
    },
    generatedAt: { type: Date },
    totalGenerated: { type: Number, default: 0 },
    // Preview configuration (client-side editor state)
    previewConfig: {
      previewName: { type: String },
      previewRole: { type: String },
      accentColor: { type: String },
      layers: [
        {
          id: { type: String },
          name: { type: String },
          type: { type: String, default: 'text' },
          text: { type: String },
          x: { type: Number },
          y: { type: Number },
          fontSize: { type: Number },
          fontWeight: { type: Number },
          color: { type: String },
          align: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
        },
      ],
    },
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
  // Atomic registration counter for capacity enforcement
  registeredCount: { type: Number, default: 0 },
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
eventSchema.index({ verificationStatus: 1, date: 1 });
eventSchema.index({ hostUserId: 1 });

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
