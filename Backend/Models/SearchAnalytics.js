const mongoose = require('mongoose');

const searchAnalyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  keywords: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  categoryTagged: String,
});

module.exports = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
