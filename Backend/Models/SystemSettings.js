const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  maintenanceMode: { type: Boolean, default: false },
  registrationEnabled: { type: Boolean, default: true },
  eventCreationEnabled: { type: Boolean, default: true },
  paidEventsEnabled: { type: Boolean, default: false },
  certificateGenerationEnabled: { type: Boolean, default: true },
  mlRecommendationsEnabled: { type: Boolean, default: true },
  emailNotificationsEnabled: { type: Boolean, default: true },
  maxEventsPerHost: { type: Number, default: 10 },
  maxParticipantsDefault: { type: Number, default: 100 },
  certificateExpiryDays: { type: Number, default: 365 },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Singleton pattern: ensure only one document exists
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
