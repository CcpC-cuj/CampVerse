const SystemSettings = require('../Models/SystemSettings');

exports.getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    // Update fields
    const allowedUpdates = [
      'maintenanceMode', 'registrationEnabled', 'eventCreationEnabled',
      'paidEventsEnabled', 'certificateGenerationEnabled', 'mlRecommendationsEnabled',
      'emailNotificationsEnabled', 'maxEventsPerHost', 'maxParticipantsDefault',
      'certificateExpiryDays'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updatedAt = Date.now();
    settings.updatedBy = req.user._id;

    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
