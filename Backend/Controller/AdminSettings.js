const SystemSettings = require('../Models/SystemSettings');
const { asyncHandler } = require('../Middleware/errorHandler');

exports.getSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSettings.getSettings();
  res.json(settings);
});

exports.updateSettings = asyncHandler(async (req, res) => {
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
  settings.updatedBy = req.user.id;

  await settings.save();
  res.json(settings);
});
