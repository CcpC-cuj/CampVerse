const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  badgeIcon: String,
  points: { type: Number, default: 0 },
  rank: Number,
  earnedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Achievement', achievementSchema);
