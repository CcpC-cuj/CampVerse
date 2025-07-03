const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['college', 'university', 'org'], required: true },
  location: {
    city: String,
    state: String,
    country: String
  },
  emailDomain: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  hostedEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Institution', institutionSchema);
