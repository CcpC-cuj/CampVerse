const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    preview: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['participation', 'achievement'], required: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
