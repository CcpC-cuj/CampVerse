const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../Middleware/Auth');
const upload = require('../Middleware/upload');
const { storageService } = require('../Services/storageService');
const CertificateTemplate = require('../Models/CertificateTemplate');

const SYSTEM_TEMPLATES = [
  {
    templateId: 'classic-blue',
    name: 'Classic Blue',
    preview: 'https://storage.campverse.com/templates/previews/classic-blue.png',
    url: 'https://storage.campverse.com/templates/classic-blue.png',
    type: 'participation',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
    isSystem: true,
  },
  {
    templateId: 'modern-purple',
    name: 'Modern Purple',
    preview: 'https://storage.campverse.com/templates/previews/modern-purple.png',
    url: 'https://storage.campverse.com/templates/modern-purple.png',
    type: 'participation',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
    isSystem: true,
  },
  {
    templateId: 'elegant-gold',
    name: 'Elegant Gold',
    preview: 'https://storage.campverse.com/templates/previews/elegant-gold.png',
    url: 'https://storage.campverse.com/templates/elegant-gold.png',
    type: 'achievement',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
    isSystem: true,
  },
  {
    templateId: 'minimal-dark',
    name: 'Minimal Dark',
    preview: 'https://storage.campverse.com/templates/previews/minimal-dark.png',
    url: 'https://storage.campverse.com/templates/minimal-dark.png',
    type: 'participation',
    uploadedAt: new Date('2024-01-01'),
    uploadedBy: 'system',
    isSystem: true,
  },
];

const mapTemplateResponse = (template) => ({
  id: template.templateId,
  name: template.name,
  preview: template.preview,
  url: template.url,
  type: template.type,
  uploadedAt: template.uploadedAt,
  uploadedBy: template.uploadedBy,
  isSystem: template.isSystem,
});

const ensureSystemTemplates = async () => {
  const count = await CertificateTemplate.countDocuments();
  if (count === 0) {
    await CertificateTemplate.insertMany(SYSTEM_TEMPLATES);
  }
};

const deriveTemplateMeta = (file) => {
  const filename = file.name || file.path || '';
  const base = filename.split('/').pop() || filename;
  const withoutExt = base.replace(/\.[^/.]+$/, '');
  const match = withoutExt.match(/^(participation|achievement)_\d+_(.+)$/i);
  const type = match ? match[1].toLowerCase() : 'participation';
  const rawName = match ? match[2] : withoutExt;
  const name = rawName.replace(/[-_]+/g, ' ').trim();

  return {
    templateId: withoutExt,
    name: name || withoutExt,
    type,
  };
};

const syncTemplatesFromStorage = async () => {
  if (storageService.getProvider() !== 'supabase') return;

  try {
    const files = await storageService.listFiles('certificates/assets/global/templates');
    if (!Array.isArray(files) || files.length === 0) return;

    const existing = await CertificateTemplate.find({
      templateId: { $in: files.map((file) => (file.name || '').replace(/\.[^/.]+$/, '')) },
    }).lean();

    const existingIds = new Set(existing.map((t) => t.templateId));

    const toInsert = files
      .filter((file) => {
        const id = (file.name || '').replace(/\.[^/.]+$/, '');
        return id && !existingIds.has(id);
      })
      .map((file) => {
        const meta = deriveTemplateMeta(file);
        return {
          templateId: meta.templateId,
          name: meta.name,
          preview: file.url,
          url: file.url,
          type: meta.type,
          uploadedAt: file.timeCreated ? new Date(file.timeCreated) : new Date(),
          uploadedBy: 'migration',
          isSystem: false,
        };
      });

    if (toInsert.length > 0) {
      await CertificateTemplate.insertMany(toInsert, { ordered: false });
    }
  } catch (error) {
    console.error('Failed to sync templates from storage:', error);
  }
};

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
      await ensureSystemTemplates();
      await syncTemplatesFromStorage();
      const templates = await CertificateTemplate.find().sort({ uploadedAt: -1 });
      res.json({
        templates: templates.map(mapTemplateResponse),
        total: templates.length,
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
          previewFile.originalname,
          `templates/previews/${templateId}.png`,
          previewFile.mimetype
        );
        previewUrl = previewUpload.url;
      }

      const newTemplate = await CertificateTemplate.create({
        templateId,
        name,
        preview: previewUrl,
        url: templateUpload.url,
        type,
        uploadedAt: new Date(),
        uploadedBy: adminId,
        isSystem: false,
      });

      res.status(201).json({
        message: 'Template uploaded successfully',
        template: mapTemplateResponse(newTemplate),
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

      const template = await CertificateTemplate.findOne({ templateId });
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }

      if (template.isSystem) {
        return res.status(403).json({ error: 'Cannot delete system templates' });
      }

      if (template.url) {
        await storageService.deleteFile(template.url).catch(() => null);
      }
      if (template.preview) {
        await storageService.deleteFile(template.preview).catch(() => null);
      }

      await CertificateTemplate.deleteOne({ templateId });

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
  return CertificateTemplate.find().then((templates) => {
    const map = {};
    templates.forEach((template) => {
      map[template.templateId] = template.url;
    });
    return map;
  });
}

module.exports = router;
module.exports.getTemplatesMap = getTemplatesMap;
