const mongoose = require('mongoose');

const hostEligibilityStatusSchema = new mongoose.Schema({
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  remarks: String,
}, { _id: false });

const eventHistorySchema = new mongoose.Schema({
  hosted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  attended: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  waitlisted: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
}, { _id: false });

const referralStatsSchema = new mongoose.Schema({
  sharedLinks: { type: Number, default: 0 },
  successfulSignups: { type: Number, default: 0 }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, match: /\.(ac|edu)\.in$/ },
  phone: { type: String, required: true },
  Gender: { type: String },
  DOB: { type: Date },
  passwordHash: { type: String, required: true },
  profilePhoto: { type: String },
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution' },
  collegeIdNumber: { type: String },
  roles: { type: [String], default: ['student'] },
  isVerified: { type: Boolean, default: false },
  canHost: { type: Boolean, default: false },
  hostEligibilityStatus: hostEligibilityStatusSchema,
  interests: [String],
  skills: [String],
  learningGoals: [String],
  badges: [String],
  referralStats: referralStatsSchema,
  eventHistory: eventHistorySchema,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
