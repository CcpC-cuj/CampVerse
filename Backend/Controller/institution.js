const Institution = require('../Models/Institution');
const User = require('../Models/User');
const Event = require('../Models/Event');

// Create a new institution (admin only)
async function createInstitution(req, res) {
  try {
    const { name, type, location, emailDomain } = req.body;
    const institution = await Institution.create({ name, type, location, emailDomain, isVerified: false });
    res.status(201).json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error creating institution.' });
  }
}

// Get all institutions (admin only)
async function getInstitutions(req, res) {
  try {
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching institutions.' });
  }
}

// Get institution by ID (admin or self)
async function getInstitutionById(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching institution.' });
  }
}

// Update institution (admin only)
async function updateInstitution(req, res) {
  try {
    const institution = await Institution.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error updating institution.' });
  }
}

// Delete institution (admin only)
async function deleteInstitution(req, res) {
  try {
    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    res.json({ message: 'Institution deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting institution.' });
  }
}

// Request institution verification (student)
async function requestInstitutionVerification(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    institution.verificationRequested = true;
    await institution.save();
    res.json({ message: 'Verification request submitted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error requesting verification.' });
  }
}

// Approve institution verification (admin only)
async function approveInstitutionVerification(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    institution.isVerified = true;
    institution.verificationRequested = false;
    await institution.save();
    res.json({ message: 'Institution verified.' });
  } catch (err) {
    res.status(500).json({ error: 'Error approving verification.' });
  }
}

// Reject institution verification (admin only)
async function rejectInstitutionVerification(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) return res.status(404).json({ error: 'Institution not found.' });
    institution.verificationRequested = false;
    await institution.save();
    res.json({ message: 'Institution verification rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting verification.' });
  }
}

// Get institution analytics (institution or admin)
async function getInstitutionAnalytics(req, res) {
  try {
    const institutionId = req.params.id;
    const studentCount = await User.countDocuments({ institutionId });
    const eventCount = await Event.countDocuments({ institutionId });
    // Optionally, add more analytics (certificates, achievements, etc.)
    res.json({ studentCount, eventCount });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics.' });
  }
}

module.exports = {
  createInstitution,
  getInstitutions,
  getInstitutionById,
  updateInstitution,
  deleteInstitution,
  requestInstitutionVerification,
  approveInstitutionVerification,
  rejectInstitutionVerification,
  getInstitutionAnalytics
}; 