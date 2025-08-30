const mongoose = require('mongoose');
const Institution = require('../Models/Institution');
const User = require('../Models/User');
const Event = require('../Models/Event');
const EventParticipationLog = require('../Models/EventParticipationLog');
const Certificate = require('../Models/Certificate');
const { notifyInstitutionRequest } = require('../Services/notification');

// Create a new institution (admin only)
async function createInstitution(req, res) {
  try {
    const { name, type, location, emailDomain } = req.body;
    const institution = await Institution.create({
      name,
      type,
      location,
      emailDomain,
      isVerified: false,
    });
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
    if (!institution)
      return res.status(404).json({ error: 'Institution not found.' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching institution.' });
  }
}

// Update institution (admin only)
async function updateInstitution(req, res) {
  try {
    const institution = await Institution.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true },
    );
    if (!institution)
      return res.status(404).json({ error: 'Institution not found.' });
    res.json(institution);
  } catch (err) {
    res.status(500).json({ error: 'Error updating institution.' });
  }
}

// Delete institution (admin only)
async function deleteInstitution(req, res) {
  try {
    const institution = await Institution.findByIdAndDelete(req.params.id);
    if (!institution)
      return res.status(404).json({ error: 'Institution not found.' });
    res.json({ message: 'Institution deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting institution.' });
  }
}

// Request institution verification (student)
async function requestInstitutionVerification(req, res) {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution)
      return res.status(404).json({ error: 'Institution not found.' });
    
    const { institutionName, email, website, phone, type, info } = req.body || {};
    
    institution.verificationRequested = true;
    institution.verificationRequests = institution.verificationRequests || [];
    institution.verificationRequests.push({
      requestedBy: req.user.id,
      institutionName: institutionName || institution.name,
      officialEmail: email || '',
      website: website || '',
      phone: phone || '',
      type: type || institution.type,
      info: info || '',
      status: 'pending',
    });

    // Add to verification history
    institution.verificationHistory.push({
      action: 'requested',
      performedBy: req.user.id,
      performedAt: new Date(),
      remarks: 'Institution verification requested by student',
      newData: {
        institutionName: institutionName || institution.name,
        website: website || '',
        phone: phone || '',
        info: info || '',
      },
    });

    await institution.save();

    // Update user's status to pending
    await User.findByIdAndUpdate(req.user.id, {
      institutionVerificationStatus: 'pending',
    });

    // Notify verifiers and admins
    try {
      const user = await User.findById(req.user.id).select('name email');
      await notifyInstitutionRequest({
        requesterId: req.user.id,
        requesterName: user?.name || 'Unknown',
        requesterEmail: user?.email || '',
        institutionName: institutionName || institution.name,
        type: type || institution.type,
      });
    } catch (e) {
      // non-blocking
    }

    res.json({ message: 'Verification request submitted to verifiers.' });
  } catch (err) {
    res.status(500).json({ error: 'Error requesting verification.' });
  }
}

// Approve institution verification (verifier or admin)
async function approveInstitutionVerification(req, res) {
  try {
    const { location, website, phone, info, remarks } = req.body || {};
    const verifierId = req.user.id;

    const institution = await Institution.findById(req.params.id);
    if (!institution)
      return res.status(404).json({ error: 'Institution not found.' });

    // Check if user is verifier or admin
    const isVerifier = req.user.roles.includes('verifier');
    const isAdmin = req.user.roles.includes('platformAdmin');
    
    if (!isVerifier && !isAdmin) {
      return res.status(403).json({ 
        error: 'Only verifiers or platform admins can approve institutions.' 
      });
    }

    // Validate website if provided
    if (website && website.trim()) {
      const urlPattern = /^https?:\/\/.+/i;
      if (!urlPattern.test(website.trim())) {
        return res.status(400).json({
          error: 'Website must be a valid URL starting with http:// or https://'
        });
      }
    }

    // Store previous data for history
    const previousData = {
      isVerified: institution.isVerified,
      website: institution.website,
      phone: institution.phone,
      info: institution.info,
      location: institution.location,
    };

    // Update institution with verifier-provided details
    institution.isVerified = true;
    institution.verificationRequested = false;

    // Verifier can add/update location and other details during approval
    if (location) {
      institution.location = {
        city: location.city || institution.location?.city || '',
        state: location.state || institution.location?.state || '',
        country: location.country || institution.location?.country || '',
      };
    }

    if (website && website.trim()) institution.website = website.trim();
    if (phone && phone.trim()) institution.phone = phone.trim();
    if (info && info.trim()) institution.info = info.trim();

    // Update verification requests status
    if (institution.verificationRequests && institution.verificationRequests.length > 0) {
      const latestRequest = institution.verificationRequests[institution.verificationRequests.length - 1];
      latestRequest.status = 'approved';
      latestRequest.verifiedBy = verifierId;
      latestRequest.verifiedAt = new Date();
      latestRequest.verifierRemarks = remarks || 'Approved by verifier';
    }

    // Add to verification history
    institution.verificationHistory.push({
      action: 'approved',
      performedBy: verifierId,
      performedAt: new Date(),
      remarks: remarks || 'Institution approved after verification',
      previousData,
      newData: {
        isVerified: true,
        website: institution.website,
        phone: institution.phone,
        info: institution.info,
        location: institution.location,
      },
    });

    await institution.save();

    // Update all users with this institution to verified status
    await User.updateMany(
      { institutionId: institution._id },
      { institutionVerificationStatus: 'verified' },
    );

    // Auto-merge: Update ALL users with the same email domain to use this verified institution
    const usersWithSameDomain = await User.find({
      email: { $regex: `@${institution.emailDomain}$`, $options: 'i' },
      institutionId: { $ne: institution._id },
    });

    if (usersWithSameDomain.length > 0) {
      // Update all users with same domain to use the verified institution
      await User.updateMany(
        { email: { $regex: `@${institution.emailDomain}$`, $options: 'i' } },
        {
          institutionId: institution._id,
          institutionVerificationStatus: 'verified',
        },
      );

      // Delete any other unverified institutions with the same domain
      const duplicateInstitutions = await Institution.find({
        emailDomain: institution.emailDomain,
        _id: { $ne: institution._id },
        isVerified: false,
      });

      if (duplicateInstitutions.length > 0) {
        await Institution.deleteMany({
          emailDomain: institution.emailDomain,
          _id: { $ne: institution._id },
          isVerified: false,
        });
      }
    }

    res.json({
      message: 'Institution verified successfully.',
      verifiedBy: isVerifier ? 'verifier' : 'admin',
      institution: {
        id: institution._id,
        name: institution.name,
        type: institution.type,
        emailDomain: institution.emailDomain,
        isVerified: institution.isVerified,
        location: institution.location,
        website: institution.website,
        phone: institution.phone,
        info: institution.info,
        verificationHistory: institution.verificationHistory,
      },
    });
  } catch (err) {
    console.error('Error approving institution verification:', err);
    res.status(500).json({ error: 'Error approving verification.' });
  }
}

// Reject institution verification (verifier or admin)
async function rejectInstitutionVerification(req, res) {
  try {
    const { remarks } = req.body || {};
    const verifierId = req.user.id;

    const institution = await Institution.findById(req.params.id);
    if (!institution)
      return res.status(404).json({ error: 'Institution not found.' });

    // Check if user is verifier or admin
    const isVerifier = req.user.roles.includes('verifier');
    const isAdmin = req.user.roles.includes('platformAdmin');
    
    if (!isVerifier && !isAdmin) {
      return res.status(403).json({ 
        error: 'Only verifiers or platform admins can reject institutions.' 
      });
    }

    institution.verificationRequested = false;

    // Update verification requests status
    if (institution.verificationRequests && institution.verificationRequests.length > 0) {
      const latestRequest = institution.verificationRequests[institution.verificationRequests.length - 1];
      latestRequest.status = 'rejected';
      latestRequest.verifiedBy = verifierId;
      latestRequest.verifiedAt = new Date();
      latestRequest.verifierRemarks = remarks || 'Rejected by verifier';
    }

    // Add to verification history
    institution.verificationHistory.push({
      action: 'rejected',
      performedBy: verifierId,
      performedAt: new Date(),
      remarks: remarks || 'Institution verification rejected',
    });

    await institution.save();

    // Update users with this institution to rejected status
    await User.updateMany(
      { institutionId: institution._id },
      { institutionVerificationStatus: 'rejected' },
    );

    res.json({ 
      message: 'Institution verification rejected.',
      rejectedBy: isVerifier ? 'verifier' : 'admin',
    });
  } catch (err) {
    res.status(500).json({ error: 'Error rejecting verification.' });
  }
}

// Get pending institution verifications (verifier or admin)
async function getPendingInstitutionVerifications(req, res) {
  try {
    // Check if user is verifier or admin
    const isVerifier = req.user.roles.includes('verifier');
    const isAdmin = req.user.roles.includes('platformAdmin');
    
    if (!isVerifier && !isAdmin) {
      return res.status(403).json({ 
        error: 'Only verifiers or platform admins can view pending verifications.' 
      });
    }

    const pendingInstitutions = await Institution.find({
      verificationRequested: true,
      isVerified: false,
    })
      .populate('verificationRequests.requestedBy', 'name email')
      .sort({ updatedAt: -1 });

    const formattedInstitutions = pendingInstitutions.map(institution => {
      const latestRequest = institution.verificationRequests[institution.verificationRequests.length - 1];
      return {
        id: institution._id,
        name: institution.name,
        type: institution.type,
        emailDomain: institution.emailDomain,
        website: institution.website,
        phone: institution.phone,
        info: institution.info,
        location: institution.location,
        latestRequest: {
          requestedBy: latestRequest?.requestedBy,
          institutionName: latestRequest?.institutionName,
          website: latestRequest?.website,
          phone: latestRequest?.phone,
          info: latestRequest?.info,
          createdAt: latestRequest?.createdAt,
          status: latestRequest?.status,
        },
        requestedAt: institution.updatedAt,
      };
    });

    res.json({
      pendingInstitutions: formattedInstitutions,
      count: formattedInstitutions.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching pending verifications.' });
  }
}

// Get institution analytics (institution or admin)
async function getInstitutionAnalytics(req, res) {
  try {
    const institutionId = req.params.id;
    const studentCount = await User.countDocuments({ institutionId });
    const eventCount = await Event.countDocuments({ institutionId });
    res.json({ studentCount, eventCount });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics.' });
  }
}

// Get institution dashboard (institution or admin) - Optimized with aggregation
async function getInstitutionDashboard(req, res) {
  try {
    const institutionId = req.params.id;
    
    // Check if dashboard is public or user has access
    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    // If dashboard is not public, check permissions
    if (!institution.publicDashboard.enabled) {
      const isAdmin = req.user?.roles?.includes('platformAdmin');
      const isFromSameInstitution = req.user?.institutionId?.toString() === institutionId;
      
      if (!isAdmin && !isFromSameInstitution) {
        return res.status(403).json({ 
          error: 'This institution dashboard is not public.' 
        });
      }
    }

    // Use aggregation pipeline to get all data in fewer queries
    const [dashboardData] = await Institution.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(institutionId) } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'institutionId',
          as: 'students'
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: 'institutionId',
          as: 'events'
        }
      },
      {
        $lookup: {
          from: 'eventparticipationlogs',
          let: { eventIds: '$events._id' },
          pipeline: [
            { $match: { $expr: { $in: ['$eventId', '$eventIds'] } } }
          ],
          as: 'participationLogs'
        }
      },
      {
        $lookup: {
          from: 'certificates',
          let: { eventIds: '$events._id' },
          pipeline: [
            { $match: { $expr: { $in: ['$eventId', '$eventIds'] } } }
          ],
          as: 'certificates'
        }
      },
      {
        $project: {
          name: 1,
          type: 1,
          isVerified: 1,
          publicDashboard: 1,
          studentCount: { $size: '$students' },
          eventCount: { $size: '$events' },
          participationCount: { $size: '$participationLogs' },
          certificateCount: { $size: '$certificates' },
          activeStudents: {
            $size: {
              $setUnion: ['$participationLogs.userId', []]
            }
          },
          recentEvents: {
            $slice: [
              {
                $sortArray: {
                  input: '$events',
                  sortBy: { 'schedule.start': -1 }
                }
              },
              5
            ]
          },
          eventTypes: {
            $arrayToObject: {
              $map: {
                input: {
                  $setUnion: ['$events.type', []]
                },
                as: 'type',
                in: {
                  k: '$type',
                  v: {
                    $size: {
                      $filter: {
                        input: '$events',
                        cond: { $eq: ['$this.type', '$type'] }
                      }
                    }
                  }
                }
              }
            }
          },
          participationLogs: 1,
          events: 1
        }
      }
    ]);

    if (!dashboardData) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    // Calculate participation rate
    const participationRate = dashboardData.studentCount > 0 
      ? Math.round((dashboardData.participationCount / dashboardData.studentCount) * 100)
      : 0;

    // Calculate inactive students
    const inactiveStudents = dashboardData.studentCount - dashboardData.activeStudents;

    // Process event breakdown for recent events
    const eventBreakdown = dashboardData.recentEvents.map(event => {
      const eventLogs = dashboardData.participationLogs.filter(
        log => log.eventId.toString() === event._id.toString()
      );
      return {
        id: event._id,
        title: event.title,
        registered: eventLogs.length,
        attended: eventLogs.filter(l => l.status === 'attended').length,
        waitlisted: eventLogs.filter(l => l.status === 'waitlisted').length,
      };
    });

    // Top events by participation
    const topEvents = eventBreakdown
      .sort((a, b) => b.registered - a.registered)
      .slice(0, 3);

    res.json({
      institution: {
        id: dashboardData._id,
        name: dashboardData.name,
        type: dashboardData.type,
        isVerified: dashboardData.isVerified,
        publicDashboard: dashboardData.publicDashboard,
      },
      studentCount: dashboardData.studentCount,
      eventCount: dashboardData.eventCount,
      participationCount: dashboardData.participationCount,
      participationRate,
      certificateCount: dashboardData.certificateCount,
      activeStudents: dashboardData.activeStudents,
      inactiveStudents,
      recentEvents: dashboardData.recentEvents,
      eventBreakdown,
      topEvents,
      eventTypes: dashboardData.eventTypes || {},
    });
  } catch (err) {
    console.error('Dashboard aggregation error:', err);
    res.status(500).json({ error: 'Error fetching dashboard.' });
  }
}

// Request public dashboard (institution user)
async function requestPublicDashboard(req, res) {
  try {
    const institutionId = req.params.id;
    const userId = req.user.id;

    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    // Check if user belongs to this institution
    const user = await User.findById(userId);
    if (user.institutionId?.toString() !== institutionId) {
      return res.status(403).json({ 
        error: 'You can only request dashboard access for your own institution.' 
      });
    }

    // Check if already requested or enabled
    if (institution.publicDashboard.enabled) {
      return res.status(400).json({ 
        error: 'Public dashboard is already enabled for this institution.' 
      });
    }

    if (institution.publicDashboard.requestedBy) {
      return res.status(400).json({ 
        error: 'Public dashboard access has already been requested.' 
      });
    }

    // Update institution with request
    institution.publicDashboard.requestedBy = userId;
    institution.publicDashboard.requestedAt = new Date();

    await institution.save();

    res.json({ 
      message: 'Public dashboard access requested. Awaiting admin approval.' 
    });
  } catch (err) {
    res.status(500).json({ error: 'Error requesting public dashboard.' });
  }
}

// Approve public dashboard (admin only)
async function approvePublicDashboard(req, res) {
  try {
    const institutionId = req.params.id;
    const adminId = req.user.id;

    if (!req.user.roles.includes('platformAdmin')) {
      return res.status(403).json({ 
        error: 'Only platform admins can approve public dashboard requests.' 
      });
    }

    const institution = await Institution.findById(institutionId);
    if (!institution) {
      return res.status(404).json({ error: 'Institution not found.' });
    }

    institution.publicDashboard.enabled = true;
    institution.publicDashboard.approvedBy = adminId;
    institution.publicDashboard.approvedAt = new Date();

    await institution.save();

    res.json({ 
      message: 'Public dashboard approved and enabled.',
      dashboardUrl: `/institutions/${institutionId}/dashboard`
    });
  } catch (err) {
    res.status(500).json({ error: 'Error approving public dashboard.' });
  }
}

async function searchInstitutions(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = await Institution.find({
      $or: [{ name: regex }, { emailDomain: regex }],
    }).limit(20);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Error searching institutions.' });
  }
}

async function requestNewInstitution(req, res) {
  try {
    const { name, type, website, phone, info } = req.body || {};

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        error: 'name and type are required.',
        received: { name, type },
      });
    }

    // Validate type enum
    const validTypes = ['college', 'university', 'org', 'temporary'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        received: { type },
      });
    }

    // Derive domain from requester email for correctness
    const requester = await User.findById(req.user.id).select('email name');

    if (!requester || !requester.email || !requester.email.includes('@')) {
      return res
        .status(400)
        .json({ error: 'Requester email not found to derive domain.' });
    }

    const computedDomain = requester.email.split('@')[1].toLowerCase();

    // Check if institution with same domain already exists
    const existingInstitution = await Institution.findOne({
      emailDomain: computedDomain,
    });
    if (existingInstitution) {
      return res.status(409).json({
        error: 'An institution with this email domain already exists.',
        existingInstitution: {
          id: existingInstitution._id,
          name: existingInstitution.name,
          isVerified: existingInstitution.isVerified,
        },
      });
    }

    // Create a new institution entry (unverified by default)
    const institutionData = {
      name: name.trim(),
      type,
      emailDomain: computedDomain,
      isVerified: false,
      isTemporary: false,
      verificationRequested: true,
      verificationRequests: [
        {
          requestedBy: req.user.id,
          institutionName: name.trim(),
          officialEmail: requester.email,
          website: website || '',
          phone: phone || '',
          type,
          info: info || '',
          status: 'pending',
        },
      ],
      verificationHistory: [
        {
          action: 'requested',
          performedBy: req.user.id,
          performedAt: new Date(),
          remarks: 'New institution requested by student',
          newData: {
            name: name.trim(),
            type,
            website: website || '',
            phone: phone || '',
            info: info || '',
          },
        },
      ],
    };

    const institution = await Institution.create(institutionData);

    // Update user to reference this institution and set status to pending
    await User.findByIdAndUpdate(req.user.id, {
      institutionId: institution._id,
      institutionVerificationStatus: 'pending',
    });

    // Notify verifiers and admins about the new institution request
    try {
      await notifyInstitutionRequest({
        requesterId: req.user.id,
        requesterName: requester?.name || 'Unknown',
        requesterEmail: requester?.email || '',
        institutionName: name.trim(),
        type,
      });
    } catch (e) {
      // Log error but don't fail the request
      console.error('Failed to notify institution request:', e);
    }

    return res.status(201).json({
      message:
        'Institution request submitted successfully. It will be reviewed by verifiers.',
      institution: {
        id: institution._id,
        name: institution.name,
        type: institution.type,
        emailDomain: institution.emailDomain,
        isVerified: institution.isVerified,
        verificationRequested: institution.verificationRequested,
        createdAt: institution.createdAt,
      },
      note: 'This institution is currently unverified. Verifiers will review and approve it.',
    });
  } catch (err) {
    // Handle specific validation errors
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors,
      });
    }

    if (err.code === 11000) {
      return res.status(409).json({
        error: 'An institution with this name or domain already exists.',
      });
    }

    return res.status(500).json({
      error: 'Error submitting institution request.',
      details:
        process.env.NODE_ENV === 'development'
          ? err.message
          : 'Internal server error',
    });
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
  getPendingInstitutionVerifications,
  getInstitutionAnalytics,
  getInstitutionDashboard,
  requestPublicDashboard,
  approvePublicDashboard,
  searchInstitutions,
  requestNewInstitution,
};