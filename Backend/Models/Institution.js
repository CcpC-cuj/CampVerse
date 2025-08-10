const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['college', 'university', 'org', 'temporary'], required: true },
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String }
  },
  emailDomain: { type: String, required: true, unique: true, lowercase: true, sparse: true },
  website: { type: String, default: '' },
  phone: { type: String, default: '' },
  info: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },
  isTemporary: { type: Boolean, default: false },
  hostedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Track verification workflow
  verificationRequested: { type: Boolean, default: false },
  verificationRequests: [
    {
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      institutionName: { type: String, required: true },
      officialEmail: { type: String, default: '' },
      website: { type: String, default: '' },
      phone: { type: String, default: '' },
      type: { type: String, required: true },
      info: { type: String, default: '' },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

// Add indexes for better performance
institutionSchema.index({ isVerified: 1 });
institutionSchema.index({ verificationRequested: 1 });

// Update the updatedAt field before saving
institutionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Institution', institutionSchema);
