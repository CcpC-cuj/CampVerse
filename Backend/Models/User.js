const mongoose = require('mongoose');

const hostEligibilityStatusSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    remarks: String,
  },
  { _id: false },
);

const eventHistorySchema = new mongoose.Schema(
  {
    hosted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    attended: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    waitlisted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  },
  { _id: false },
);

const referralStatsSchema = new mongoose.Schema(
  {
    sharedLinks: { type: Number, default: 0 },
    successfulSignups: { type: Number, default: 0 },
  },
  { _id: false },
);

const verifierEligibilityStatusSchema = new mongoose.Schema(
  {
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    remarks: String,
  },
  { _id: false },
);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /\.(ac|edu)\.in$|\.edu$/,
  },
  phone: { type: String, required: false },
  location: { type: String },
  bio: { type: String },
  Gender: { type: String },
  DOB: { type: Date },
  passwordHash: { type: String, required: true },
  // Indicates whether the user has explicitly set a password (Google-only users start as false)
  passwordSetup: { type: Boolean, default: true },
  profilePhoto: { type: String },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  institutionVerificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  collegeIdNumber: { type: String },
  roles: { type: [String], default: ['student'] },
  isVerified: { type: Boolean, default: false },
  canHost: { type: Boolean, default: false },
  hostEligibilityStatus: hostEligibilityStatusSchema,
  hostRequestIdCardPhoto: { type: String }, // URL to uploaded ID card photo
  hostRequestEventPermission: { type: String }, // URL to uploaded event permission document (optional)
  verifierEligibilityStatus: verifierEligibilityStatusSchema,
  interests: [String],
  skills: [String],
  learningGoals: [String],
  badges: [String],
  referralStats: referralStatsSchema,
  eventHistory: eventHistorySchema,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletionRequestedAt: { type: Date },
  deletionScheduledFor: { type: Date },
  notificationPreferences: {
    email: {
      rsvp: { type: Boolean, default: true },
      certificate: { type: Boolean, default: true },
      cohost: { type: Boolean, default: true },
      event_verification: { type: Boolean, default: true },
      host_request: { type: Boolean, default: true },
    },
    inApp: {
      rsvp: { type: Boolean, default: true },
      certificate: { type: Boolean, default: true },
      cohost: { type: Boolean, default: true },
      event_verification: { type: Boolean, default: true },
      host_request: { type: Boolean, default: true },
    },
  },
  // Frontend gate: mark onboarding as completed to avoid showing modal repeatedly
  onboardingCompleted: { type: Boolean, default: false },
  // Track if user has linked Google account for dual login capability
  googleLinked: { type: Boolean, default: false },
  // New: track supported auth methods and primary method
  authMethods: { type: [String], enum: ['password', 'google'], default: [] },
  primaryAuthMethod: {
    type: String,
    enum: ['password', 'google'],
    default: 'password',
  },
  googleId: { type: String },
});

userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.index({ institutionId: 1 });

module.exports = mongoose.model('User', userSchema);
