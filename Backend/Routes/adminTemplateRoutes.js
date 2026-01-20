const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../Middleware/Auth');
const upload = require('../Middleware/upload');
const { storageService } = require('../Services/storageService');

// In-memory store for predefined templates (in production, use database)
let CERTIFICATE_TEMPLATES = [
  {
    id: 'classic-blue',
    name: 'Classic Blue',
    preview: 'https://storage.campverse.com/templates/previews/classic-blue.png',
    url: 'https://storage.campverse.com/templates/classic-blue.png',
    type: 'participation',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
  },
  {
    id: 'modern-purple',
    name: 'Modern Purple',
    preview: 'https://storage.campverse.com/templates/previews/modern-purple.png',
    url: 'https://storage.campverse.com/templates/modern-purple.png',
    type: 'participation',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
  },
  {
    id: 'elegant-gold',
    name: 'Elegant Gold',
    preview: 'https://storage.campverse.com/templates/previews/elegant-gold.png',
    url: 'https://storage.campverse.com/templates/elegant-gold.png',
    type: 'achievement',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
  },
  {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    preview: 'https://storage.campverse.com/templates/previews/minimal-dark.png',
    url: 'https://storage.campverse.com/templates/minimal-dark.png',
    type: 'participation',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
  },
];

/**
 * @swagger
 * /api/admin/certificate-templates:
 *   get:
 *     summary: Get all available certificate templates
 *     tags: [Admin - Certificate Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all certificate templates
 */
router.get(
  '/certificate-templates',
  authenticateToken,
  async (req, res) => {
    try {
      res.json({
        templates: CERTIFICATE_TEMPLATES,
        total: CERTIFICATE_TEMPLATES.length,
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }
);

/**
 * @swagger
 * /api/admin/certificate-templates:
 *   post:
 *     summary: Upload a new certificate template (Admin only)
 *     tags: [Admin - Certificate Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               template:
 *                 type: string
 *                 format: binary
 *                 description: Template image file (PNG/JPG)
 *               preview:
 *                 type: string
 *                 format: binary
 *                 description: Preview thumbnail (optional)
 *               name:
 *                 type: string
 *                 description: Display name for the template
 *               type:
 *                 type: string
 *                 enum: [participation, achievement]
 *                 description: Type of certificate this template is for
 *     responses:
 *       201:
 *         description: Template uploaded successfully
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Admin access required
 */
router.post(
  '/certificate-templates',
  authenticateToken,
  requireRole(['platformAdmin', 'verifier']),
  upload.fields([
    { name: 'template', maxCount: 1 },
    { name: 'preview', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { name, type } = req.body;
      const adminId = req.user.id;

      // Validate required fields
      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      if (!req.files?.template || req.files.template.length === 0) {
        return res.status(400).json({ error: 'Template file is required' });
      }

      const templateFile = req.files.template[0];
      const previewFile = req.files.preview?.[0];

      // Generate unique template ID
      const templateId = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

      // Upload template to cloud storage
      const templateUpload = await storageService.uploadCertificateTemplate(
        templateFile.buffer,
        templateFile.originalname,
        'global', // Global templates, not event-specific
        type,
        templateFile.mimetype
      );

      // Upload preview if provided, otherwise use template URL
      let previewUrl = templateUpload.url;
      if (previewFile) {
        const previewUpload = await storageService.uploadFile(
          previewFile.buffer,
          `templates/previews/${templateId}.png`,
          previewFile.mimetype
        );
        previewUrl = previewUpload.url;
      }

      // Create new template entry
      const newTemplate = {
        id: templateId,
        name,
        preview: previewUrl,
        url: templateUpload.url,
        type,
        uploadedAt: new Date(),
        uploadedBy: adminId,
      };

      // Add to templates list
      CERTIFICATE_TEMPLATES.push(newTemplate);

      res.status(201).json({
        message: 'Template uploaded successfully',
        template: newTemplate,
      });
    } catch (error) {
      console.error('Error uploading template:', error);
      res.status(500).json({ error: 'Failed to upload template' });
    }
  }
);

/**
 * @swagger
 * /api/admin/certificate-templates/{templateId}:
 *   delete:
 *     summary: Delete a certificate template (Admin only)
 *     tags: [Admin - Certificate Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 */
router.delete(
  '/certificate-templates/:templateId',
  authenticateToken,
  requireRole(['platformAdmin']),
  async (req, res) => {
    try {
      const { templateId } = req.params;

      const templateIndex = CERTIFICATE_TEMPLATES.findIndex(t => t.id === templateId);
      if (templateIndex === -1) {
        return res.status(404).json({ error: 'Template not found' });
      }

      // Don't allow deleting system templates
      const template = CERTIFICATE_TEMPLATES[templateIndex];
      if (template.uploadedBy === 'system') {
        return res.status(403).json({ error: 'Cannot delete system templates' });
      }

      // Remove from list
      CERTIFICATE_TEMPLATES.splice(templateIndex, 1);

      res.json({
        message: 'Template deleted successfully',
        templateId,
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }
);

/**
 * Get templates lookup map for other services
 */
function getTemplatesMap() {
  const map = {};
  CERTIFICATE_TEMPLATES.forEach(t => {
    map[t.id] = t.url;
  });
  return map;
}

module.exports = router;
module.exports.getTemplatesMap = getTemplatesMap;
module.exports.CERTIFICATE_TEMPLATES = CERTIFICATE_TEMPLATES;
