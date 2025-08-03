const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  type: { 
    type: String, 
    enum: ['college', 'university', 'org', 'temporary'], 
    required: true 
  },
  location: {
    city: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    state: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    },
    country: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100
    }
  },
  emailDomain: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  isVerified: { type: Boolean, default: false },
  isTemporary: { type: Boolean, default: false },
  verificationRequested: { type: Boolean, default: false },
  hostedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update timestamp on save
institutionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add indexes for better performance
institutionSchema.index({ emailDomain: 1 });
institutionSchema.index({ isVerified: 1 });
institutionSchema.index({ isTemporary: 1 });
institutionSchema.index({ verificationRequested: 1 });
institutionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Institution', institutionSchema);
