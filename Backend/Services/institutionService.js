/**
 * Institution Service Layer
 * Handles business logic for institution operations
 */

const mongoose = require('mongoose');
const Institution = require('../Models/Institution');
const User = require('../Models/User');
const { 
  NotFoundError, 
  ConflictError, 
  ValidationError,
  AuthorizationError 
} = require('../Utils/errors');
const { notifyInstitutionRequest } = require('./notification');

class InstitutionService {
  /**
   * Create a new institution
   */
  async createInstitution(data, createdBy) {
    try {
      const institution = await Institution.create({
        ...data,
        createdBy,
        verificationHistory: [{
          action: 'created',
          performedBy: createdBy,
          performedAt: new Date(),
          remarks: 'Institution created by admin',
          newData: data
        }]
      });
      
      return institution;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictError('Institution with this email domain already exists');
      }
      throw error;
    }
  }

  /**
   * Get institution by ID with access control
   */
  async getInstitutionById(institutionId, user) {
    const institution = await Institution.findById(institutionId);
    if (!institution) {
      throw new NotFoundError('Institution');
    }

    // Check access permissions
    const isAdmin = user.roles.includes('platformAdmin');
    const isFromSameInstitution = user.institutionId?.toString() === institutionId;
    const isPublicDashboard = institution.publicDashboard?.enabled;

    if (!isAdmin && !isFromSameInstitution && !isPublicDashboard) {
      throw new AuthorizationError('Access denied to this institution');
    }

    return institution;
  }

  /**
   * Request institution verification
   */
  async requestVerification(institutionId, requestData, requestedBy) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const institution = await Institution.findById(institutionId).session(session);
        if (!institution) {
          throw new NotFoundError('Institution');
        }

        // Check if verification already requested
        if (institution.verificationRequested) {
          throw new ConflictError('Verification already requested for this institution');
        }

        // Update institution
        institution.verificationRequested = true;
        institution.verificationRequests.push({
          requestedBy,
          ...requestData,
          status: 'pending',
          createdAt: new Date()
        });

        // Add to history
        institution.verificationHistory.push({
          action: 'requested',
          performedBy: requestedBy,
          performedAt: new Date(),
          remarks: 'Institution verification requested',
          newData: requestData
        });

        await institution.save({ session });

        // Update user status
        await User.findByIdAndUpdate(
          requestedBy,
          { institutionVerificationStatus: 'pending' },
          { session }
        );

        return institution;
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Approve institution verification
   */
  async approveVerification(institutionId, approvalData, approvedBy) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const institution = await Institution.findById(institutionId).session(session);
        if (!institution) {
          throw new NotFoundError('Institution');
        }

        // Validate website if provided
        if (approvalData.website) {
          const urlPattern = /^https?:\/\/.+/i;
          if (!urlPattern.test(approvalData.website)) {
            throw new ValidationError('Website must be a valid URL starting with http:// or https://');
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

        // Update institution
        institution.isVerified = true;
        institution.verificationRequested = false;

        // Update fields
        if (approvalData.location) {
          institution.location = {
            city: approvalData.location.city || institution.location?.city || '',
            state: approvalData.location.state || institution.location?.state || '',
            country: approvalData.location.country || institution.location?.country || '',
          };
        }

        if (approvalData.website?.trim()) institution.website = approvalData.website.trim();
        if (approvalData.phone?.trim()) institution.phone = approvalData.phone.trim();
        if (approvalData.info?.trim()) institution.info = approvalData.info.trim();

        // Update latest verification request
        if (institution.verificationRequests.length > 0) {
          const latestRequest = institution.verificationRequests[institution.verificationRequests.length - 1];
          latestRequest.status = 'approved';
          latestRequest.verifiedBy = approvedBy;
          latestRequest.verifiedAt = new Date();
          latestRequest.verifierRemarks = approvalData.remarks || 'Approved by verifier';
        }

        // Add to history
        institution.verificationHistory.push({
          action: 'approved',
          performedBy: approvedBy,
          performedAt: new Date(),
          remarks: approvalData.remarks || 'Institution approved after verification',
          previousData,
          newData: {
            isVerified: true,
            website: institution.website,
            phone: institution.phone,
            info: institution.info,
            location: institution.location,
          },
        });

        await institution.save({ session });

        // Update all users with this institution
        await User.updateMany(
          { institutionId: institution._id },
          { institutionVerificationStatus: 'verified' },
          { session }
        );

        // Auto-merge users with same domain
        await this._autoMergeUsers(institution, session);

        return institution;
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Reject institution verification
   */
  async rejectVerification(institutionId, rejectionData, rejectedBy) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const institution = await Institution.findById(institutionId).session(session);
        if (!institution) {
          throw new NotFoundError('Institution');
        }

        institution.verificationRequested = false;

        // Update latest verification request
        if (institution.verificationRequests.length > 0) {
          const latestRequest = institution.verificationRequests[institution.verificationRequests.length - 1];
          latestRequest.status = 'rejected';
          latestRequest.verifiedBy = rejectedBy;
          latestRequest.verifiedAt = new Date();
          latestRequest.verifierRemarks = rejectionData.remarks || 'Rejected by verifier';
        }

        // Add to history
        institution.verificationHistory.push({
          action: 'rejected',
          performedBy: rejectedBy,
          performedAt: new Date(),
          remarks: rejectionData.remarks || 'Institution verification rejected',
        });

        await institution.save({ session });

        // Update users with this institution
        await User.updateMany(
          { institutionId: institution._id },
          { institutionVerificationStatus: 'rejected' },
          { session }
        );

        return institution;
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Get pending verifications for verifiers
   */
  async getPendingVerifications(user) {
    // Check permissions
    const isVerifier = user.roles.includes('verifier');
    const isAdmin = user.roles.includes('platformAdmin');
    
    if (!isVerifier && !isAdmin) {
      throw new AuthorizationError('Only verifiers or platform admins can view pending verifications');
    }

    const pendingInstitutions = await Institution.find({
      verificationRequested: true,
      isVerified: false,
    })
    .populate('verificationRequests.requestedBy', 'name email')
    .sort({ updatedAt: -1 });

    return pendingInstitutions.map(institution => {
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
  }

  /**
   * Request new institution creation
   */
  async requestNewInstitution(requestData, requestedBy) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        const { name, type, website, phone, info } = requestData;

        // Validate required fields
        if (!name || !type) {
          throw new ValidationError('name and type are required');
        }

        // Validate type
        const validTypes = ['college', 'university', 'org', 'temporary'];
        if (!validTypes.includes(type)) {
          throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }

        // Get requester details
        const requester = await User.findById(requestedBy).select('email name').session(session);
        if (!requester?.email?.includes('@')) {
          throw new ValidationError('Requester email not found to derive domain');
        }

        const computedDomain = requester.email.split('@')[1].toLowerCase();

        // Check for existing institution
        const existingInstitution = await Institution.findOne({
          emailDomain: computedDomain,
        }).session(session);

        if (existingInstitution) {
          throw new ConflictError('An institution with this email domain already exists');
        }

        // Create institution
        const institutionData = {
          name: name.trim(),
          type,
          emailDomain: computedDomain,
          isVerified: false,
          isTemporary: false,
          verificationRequested: true,
          verificationRequests: [{
            requestedBy,
            institutionName: name.trim(),
            officialEmail: requester.email,
            website: website || '',
            phone: phone || '',
            type,
            info: info || '',
            status: 'pending',
          }],
          verificationHistory: [{
            action: 'requested',
            performedBy: requestedBy,
            performedAt: new Date(),
            remarks: 'New institution requested by student',
            newData: { name: name.trim(), type, website: website || '', phone: phone || '', info: info || '' },
          }],
        };

        const institution = await Institution.create([institutionData], { session });

        // Update user
        await User.findByIdAndUpdate(
          requestedBy,
          {
            institutionId: institution[0]._id,
            institutionVerificationStatus: 'pending',
          },
          { session }
        );

        // Send notifications (non-blocking)
        setImmediate(async () => {
          try {
            await notifyInstitutionRequest({
              requesterId: requestedBy,
              requesterName: requester?.name || 'Unknown',
              requesterEmail: requester?.email || '',
              institutionName: name.trim(),
              type,
            });
          } catch (e) {
            console.error('Failed to notify institution request:', e);
          }
        });

        return institution[0];
      });
    } finally {
      await session.endSession();
    }
  }

  /**
   * Auto-merge users with same email domain to verified institution
   */
  async _autoMergeUsers(institution, session) {
    const usersWithSameDomain = await User.find({
      email: { $regex: `@${institution.emailDomain}$`, $options: 'i' },
      institutionId: { $ne: institution._id },
    }).session(session);

    if (usersWithSameDomain.length > 0) {
      // Update all users with same domain
      await User.updateMany(
        { email: { $regex: `@${institution.emailDomain}$`, $options: 'i' } },
        {
          institutionId: institution._id,
          institutionVerificationStatus: 'verified',
        },
        { session }
      );

      // Delete duplicate unverified institutions
      await Institution.deleteMany({
        emailDomain: institution.emailDomain,
        _id: { $ne: institution._id },
        isVerified: false,
      }, { session });
    }
  }

  /**
   * Search institutions
   */
  async searchInstitutions(query, limit = 20) {
    if (!query?.trim()) return [];
    
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return await Institution.find({
      $or: [{ name: regex }, { emailDomain: regex }],
    }).limit(limit);
  }
}

module.exports = new InstitutionService();