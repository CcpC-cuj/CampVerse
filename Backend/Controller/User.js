/*
 * ML Integration & Drive Structure (Planned/Current):
 *
 * 1. Event Recommendation:
 *    - Endpoint will call external ML API to fetch personalized event recommendations for users (for dashboard).
 *    - Fallback logic should be present if ML API is unavailable.
 *
 * 2. Certificate Generation:
 *    - Host selects/uploads certificate template for event.
 *    - Certificate generation endpoint will call ML API, restricted to users marked as 'attended'.
 *    - Generated certificates will be stored and linked to users.
 *    - (Planned) All certificates for an event will be stored in a Drive folder named after the event.
 *
 * 3. Event Images:
 *    - Logos and banners are uploaded to separate Drive folders (see driveService.js for details).
 *
 * These comments are for documentation and planning only; they do not affect code execution.
 */
const User = require('../Models/User');
const Certificate = require('../Models/Certificate');
const Achievement = require('../Models/Achievement');
const EventParticipationLog = require('../Models/EventParticipationLog');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createOtpService } = require('../Services/otp');
const otpService = createOtpService();
const { createEmailService } = require('../Services/email');
const emailService = createEmailService();
const { notifyHostRequest, notifyHostStatusUpdate } = require('../Services/notification');
const { createClient } = require('redis');
const { OAuth2Client } = require('google-auth-library');
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});
const crypto = require('crypto');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Academic email domain check (.ac.in or .edu.in, flexible for subdomains)
const isAcademicEmail = (email) => /@[\w.-]+\.(ac|edu)\.in$/i.test(email) || /@[\w.-]+\.edu$/i.test(email);

function extractDomain(email) {
  return email.split('@')[1].toLowerCase();
}

async function findOrCreateInstitution(domain) {
  const Institution = require('../Models/Institution');
  
  // First, check if there's already a verified institution with this domain
  let institution = await Institution.findOne({ 
    emailDomain: domain, 
    isVerified: true 
  });
  
  if (institution) {
    // If verified institution exists, use it
    return institution;
  }
  
  // Check if there's already a temporary institution with this domain
  institution = await Institution.findOne({ 
    emailDomain: domain, 
    isTemporary: true 
  });
  
  if (institution) {
    // If temporary institution exists, use it (don't create duplicate)
    return institution;
  }
  
  // Only create new temporary institution if none exists for this domain
  institution = await Institution.create({
    name: `Temporary - ${domain}`,
    type: 'temporary',
    emailDomain: domain,
    isVerified: false,
    isTemporary: true,
    location: { city: 'Unknown', state: 'Unknown', country: 'Unknown' }
  });
  
  return institution;
}

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis', // Use Docker Compose service name
    port: process.env.REDIS_PORT || 6379
  }
});

// Add proper error handling for Redis connection
redisClient.on('error', err => {
  logger.error('Redis Client Error:', err);
});

// Connect to Redis with proper error handling
(async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      logger.info('Redis connected');
    }
  } catch (err) {
    logger.error('Redis connection failed:', err);
    // Don't exit the process, just log the error
  }
})();

// Input validation helper functions
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  const phoneRegex = /^[0-9]{10}$/;
  return phoneRegex.test(phone);
}

function validatePassword(password) {
  return password && password.length >= 6;
}

function validateName(name) {
  return name && name.trim().length >= 2;
}

// ---------------- Google Sign-In ----------------
async function googleSignIn(req, res) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Google token missing.' });

    // Handle mock tokens for testing
    if (token.startsWith('mock_google_token_')) {
      // Extract email and name from token if present
      let mockEmail = 'test.user@cuj.ac.in';
      let mockName = 'Test User';
      const parts = token.split('__');
      if (parts.length === 2) {
        mockEmail = parts[1];
        mockName = mockEmail.split('@')[0].replace(/\./g, ' ').replace(/\d+/g, '').replace(/(^|\s)\S/g, l => l.toUpperCase());
      }
      if (!isAcademicEmail(mockEmail)) {
        return res.status(400).json({ error: 'Only academic emails (.ac.in, .edu.in, or .edu) are allowed.', forceLogout: true });
      }
      let user = await User.findOne({ email: mockEmail });
      if (!user) {
        // Handle institution assignment
        const domain = extractDomain(mockEmail);
        const institution = await findOrCreateInstitution(domain);
        
        // Generate a random password hash for Google users
        const randomPassword = `google_user_${Date.now()}`;
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = new User({
          name: mockName,
          email: mockEmail,
          phone: '', // Allow empty phone for Google signup
          profilePhoto: '',
          passwordHash,
          institutionId: institution._id,
          institutionVerificationStatus: institution.isVerified ? 'verified' : 'pending',
          roles: ['student'],
          isVerified: false, // Require profile completion
          canHost: false,
          createdAt: new Date()
        });
        await user.save();
      }
      user.lastLogin = new Date();
      await user.save();
      const jwtToken = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.json({
        message: 'Google login successful (mock)',
        token: jwtToken,
        user: sanitizeUser(user),
        requiresProfileCompletion: !user.phone || !user.interests || user.interests.length === 0
      });
    }

    // Real Google OAuth implementation
    try {
      // Use access token to get user info from Google
      const userInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`);
      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info from Google');
      }
      const userInfo = await userInfoResponse.json();
      const { email, name, picture } = userInfo;
      if (!email) {
        return res.status(400).json({ error: 'Email not provided by Google.' });
      }
      if (!isAcademicEmail(email)) {
        return res.status(400).json({ error: 'Only academic emails (.ac.in, .edu.in, or .edu) are allowed.', forceLogout: true });
      }
      let user = await User.findOne({ email });
      if (!user) {
        // Handle institution assignment
        const domain = extractDomain(email);
        const institution = await findOrCreateInstitution(domain);
        
        // Generate a random password hash for Google users
        const randomPassword = `google_user_${Date.now()}`;
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = new User({
          name: name || email.split('@')[0],
          email,
          phone: '', // Allow empty phone for Google signup
          profilePhoto: picture || '',
          passwordHash,
          institutionId: institution._id,
          institutionVerificationStatus: institution.isVerified ? 'verified' : 'pending',
          roles: ['student'],
          isVerified: false, // Require profile completion
          canHost: false,
          createdAt: new Date()
        });
        await user.save();
      }
      user.lastLogin = new Date();
      await user.save();
      const jwtToken = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.json({
        message: 'Google login successful',
        token: jwtToken,
        user: sanitizeUser(user),
        requiresProfileCompletion: !user.phone || !user.interests || user.interests.length === 0
      });
    } catch (googleError) {
      logger.error('Google token verification failed:', googleError);
      return res.status(401).json({ error: 'Invalid Google token.' });
    }

  } catch (err) {
    logger.error('Google Login Error:', err);
    return res.status(500).json({ error: 'Google login failed.' });
  }
}

// ---------------- Request Institution Verification ----------------
async function requestInstitutionVerification(req, res) {
  try {
    const userId = req.user.id;
    const { institutionName, institutionType, location, collegeIdNumber } = req.body;

    // Validate required fields
    if (!institutionName) {
      return res.status(400).json({ error: 'Institution name is required.' });
    }
    if (!institutionType) {
      return res.status(400).json({ error: 'Institution type is required.' });
    }
    if (!location || !location.city || !location.state || !location.country) {
      return res.status(400).json({ error: 'Complete location information is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if user already has a verified institution
    if (user.institutionVerificationStatus === 'verified') {
      return res.status(400).json({ error: 'User already has a verified institution.' });
    }

    // Update user's institution information
    const updateData = {
      collegeIdNumber: collegeIdNumber || user.collegeIdNumber,
      institutionVerificationStatus: 'pending'
    };

    // If user has a temporary institution, update it with the provided details
    if (user.institutionId) {
      const Institution = require('../Models/Institution');
      const institution = await Institution.findById(user.institutionId);
      
      if (institution && institution.isTemporary) {
        // Update the temporary institution with real details
        await Institution.findByIdAndUpdate(user.institutionId, {
          name: institutionName,
          type: institutionType,
          location: location,
          isTemporary: false,
          verificationRequested: true
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    });

    return res.json({
      message: 'Institution verification request submitted successfully.',
      user: sanitizeUser(updatedUser)
    });

  } catch (err) {
    logger.error('RequestInstitutionVerification error:', err);
    return res.status(500).json({ error: 'Server error requesting institution verification.' });
  }
}

// ---------------- Complete Profile (for Google signup) ----------------
async function completeProfile(req, res) {
  try {
    const { phone, interests, skills, learningGoals, collegeIdNumber } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }
    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }
    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ error: 'At least one interest is required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Update user profile
    const updateData = {
      phone,
      interests,
      isVerified: true // Mark as verified after profile completion
    };

    // Add optional fields if provided
    if (skills && Array.isArray(skills)) {
      updateData.skills = skills;
    }
    if (learningGoals && Array.isArray(learningGoals)) {
      updateData.learningGoals = learningGoals;
    }
    if (collegeIdNumber) {
      updateData.collegeIdNumber = collegeIdNumber;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true
    });

    return res.json({
      message: 'Profile completed successfully.',
      user: sanitizeUser(updatedUser)
    });

  } catch (err) {
    logger.error('CompleteProfile error:', err);
    return res.status(500).json({ error: 'Server error completing profile.' });
  }
}

// ---------------- Register ----------------
async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body;

    // Comprehensive validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ 
        error: 'All fields (name, email, phone, password) are required.',
        missing: {
          name: !name,
          email: !email,
          phone: !phone,
          password: !password
        }
      });
    }

    if (!validateName(name)) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long.' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!isAcademicEmail(email)) {
      return res.status(400).json({ error: 'Only academic emails (.ac.in, .edu.in, or .edu) are allowed.' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number.' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    // Handle institution assignment
    const domain = extractDomain(email);
    const institution = await findOrCreateInstitution(domain);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      phone,
      passwordHash,
      institutionId: institution._id,
      institutionVerificationStatus: institution.isVerified ? 'verified' : 'pending',
      roles: ['student'],
      isVerified: false, // Will be verified after OTP
      canHost: false,
      createdAt: new Date()
    });

    await user.save();

    // Generate and send OTP
    const otp = await otpService.generateOtp(email);
    await emailService.sendMail({
      to: email,
      subject: 'Verify your CampVerse account',
      text: `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.`
    });

    return res.status(201).json({
      message: 'Registration successful. Please check your email for verification code.',
      user: sanitizeUser(user)
    });

  } catch (err) {
    logger.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}
// Verify OTP
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required.' });

    // Verify OTP using the service
    const isValid = await otpService.verifyOtp(email, otp);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Mark user as verified
    user.isVerified = true;
    await user.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.json({
      message: 'Email verified successfully.',
      token,
      user: sanitizeUser(user),
      requiresProfileCompletion: !user.phone || !user.interests || user.interests.length === 0
    });

  } catch (err) {
    logger.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Server error during OTP verification.' });
  }
}

// Login with email & password
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found.' });

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) return res.status(400).json({ error: 'Incorrect password.' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.json({
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    logger.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
}

// Update user preferences (POST /updatePreferences)
async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Allow all profile fields to be updated
    const allowedFields = ['name', 'phone', 'Gender', 'DOB', 'profilePhoto', 'collegeIdNumber', 'interests', 'skills', 'learningGoals', 'badges', 'location'];
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) filteredUpdates[key] = updates[key];
    }

    const updatedUser = await User.findByIdAndUpdate(userId, filteredUpdates, {
      new: true,
      runValidators: true
    }).select('-passwordHash');

    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });

    return res.json({ message: 'Preferences updated.', user: updatedUser });
  } catch (err) {
    logger.error('Update preferences error:', err);
    return res.status(500).json({ error: 'Server error updating preferences.' });
  }
}

// Get logged in user profile (GET /me)
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json(user);
  } catch (err) {
    logger.error('GetMe error:', err);
    return res.status(500).json({ error: 'Server error fetching profile.' });
  }
}

// PATCH /me — update own profile
async function updateMe(req, res) {
  try {
    const userId = req.user.id;
    const updates = req.body;
    // Allow all profile fields to be updated
    const allowedFields = ['name', 'phone', 'Gender', 'DOB', 'profilePhoto', 'collegeIdNumber', 'interests', 'skills', 'learningGoals', 'badges', 'location'];
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) filteredUpdates[key] = updates[key];
    }
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }
    const updatedUser = await User.findByIdAndUpdate(userId, filteredUpdates, {
      new: true,
      runValidators: true
    }).select('-passwordHash');
    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
    return res.json({ message: 'Profile updated.', user: updatedUser });
  } catch (err) {
    logger.error('UpdateMe error:', err);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
}

// Get user by id (GET /:id)
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json(user);
  } catch (err) {
    logger.error('GetUserById error:', err);
    return res.status(500).json({ error: 'Server error fetching user.' });
  }
}

// Update user by id (PATCH /:id)
async function updateUserById(req, res) {
  try {
    const updates = req.body;
    // For security, don't allow password or roles update here unless you want to
    if ('passwordHash' in updates) delete updates.passwordHash;

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).select('-passwordHash');

    if (!updatedUser) return res.status(404).json({ error: 'User not found.' });
    return res.json({ message: 'User updated.', user: updatedUser });
  } catch (err) {
    logger.error('UpdateUserById error:', err);
    return res.status(500).json({ error: 'Server error updating user.' });
  }
}

/**
 * GET /me/dashboard — User dashboard stats
 */
async function getDashboard(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .populate('eventHistory.hosted')
      .populate('eventHistory.attended')
      .populate('eventHistory.saved')
      .populate('eventHistory.waitlisted')
      .select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Get certificates count
    const certificatesCount = await Certificate.countDocuments({ userId: user._id });
    
    // Get achievements count
    const achievementsCount = await Achievement.countDocuments({ userId: user._id });
    
    // Get participation logs for more detailed stats
    const participationLogs = await EventParticipationLog.find({ userId: user._id });
    const registeredEvents = participationLogs.filter(log => log.status === 'registered').length;

    // Profile completion calculation
    const requiredFields = ['name', 'email', 'phone', 'Gender', 'DOB', 'profilePhoto', 'collegeIdNumber'];
    let filled = 0;
    requiredFields.forEach(f => { if (user[f]) filled++; });
    const profileCompletion = Math.round((filled / requiredFields.length) * 100);

    // Enhanced Stats
    const stats = {
      totalAttended: user.eventHistory?.attended?.length || 0,
      totalHosted: user.eventHistory?.hosted?.length || 0,
      totalSaved: user.eventHistory?.saved?.length || 0,
      totalWaitlisted: user.eventHistory?.waitlisted?.length || 0,
      totalRegistered: registeredEvents,
      totalParticipationLogs: participationLogs.length,
      certificates: certificatesCount,
      achievements: achievementsCount,
      referralStats: user.referralStats || { sharedLinks: 0, successfulSignups: 0 },
      profileCompletion,
      isHost: user.roles.includes('host'),
      isVerifier: user.roles.includes('verifier'),
      hostEligibilityStatus: user.hostEligibilityStatus,
      verifierEligibilityStatus: user.verifierEligibilityStatus,
      institutionVerificationStatus: user.institutionVerificationStatus,
      lastLogin: user.lastLogin,
      accountCreated: user.createdAt,
      accountAge: Math.floor((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)) // days since account creation
    };
    return res.json({ user, stats });
  } catch (err) {
    logger.error('GetDashboard error:', err);
    return res.status(500).json({ error: 'Server error fetching dashboard.' });
  }
}

// Get certificates of user (GET /:id/certificates)
async function getUserCertificates(req, res) {
  try {
    const certificates = await Certificate.find({ userId: req.params.id });
    return res.json(certificates);
  } catch (err) {
    logger.error('GetUserCertificates error:', err);
    return res.status(500).json({ error: 'Server error fetching certificates.' });
  }
}

// Get achievements of user (GET /:id/achievements)
async function getUserAchievements(req, res) {
  try {
    const achievements = await Achievement.find({ userId: req.params.id });
    return res.json(achievements);
  } catch (err) {
    logger.error('GetUserAchievements error:', err);
    return res.status(500).json({ error: 'Server error fetching achievements.' });
  }
}

// Get events related to user (hosted, attended, saved, waitlisted) (GET /:id/events)
async function getUserEvents(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .populate('eventHistory.hosted')
      .populate('eventHistory.attended')
      .populate('eventHistory.saved')
      .populate('eventHistory.waitlisted');

    if (!user) return res.status(404).json({ error: 'User not found.' });

    return res.json({
      hosted: user.eventHistory.hosted,
      attended: user.eventHistory.attended,
      saved: user.eventHistory.saved,
      waitlisted: user.eventHistory.waitlisted
    });
  } catch (err) {
    logger.error('GetUserEvents error:', err);
    return res.status(500).json({ error: 'Server error fetching user events.' });
  }
}

// Grant host access (POST /:id/grant-host) — only platformAdmin middleware should protect
async function grantHostAccess(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.canHost = true;
    if (!user.roles.includes('host')) {
      user.roles.push('host');
    }
    user.hostEligibilityStatus = {
      approvedBy: req.user.id,
      approvedAt: new Date(),
      remarks: req.body.remarks || 'Approved by platform admin'
    };

    await user.save();

    return res.json({ message: 'Host access granted.', user: sanitizeUser(user) });
  } catch (err) {
    logger.error('GrantHostAccess error:', err);
    return res.status(500).json({ error: 'Server error granting host access.' });
  }
}

// Grant verifier access (POST /:id/grant-verifier) — only platformAdmin middleware should protect
async function grantVerifierAccess(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (!user.roles.includes('verifier')) {
      user.roles.push('verifier');
    }
    user.verifierEligibilityStatus = {
      approvedBy: req.user.id,
      approvedAt: new Date(),
      remarks: req.body.remarks || 'Approved by platform admin'
    };

    await user.save();

    return res.json({ message: 'Verifier access granted.', user: sanitizeUser(user) });
  } catch (err) {
    logger.error('GrantVerifierAccess error:', err);
    return res.status(500).json({ error: 'Server error granting verifier access.' });
  }
}

// Request host access (user self-request)
async function requestHostAccess(req, res) {
  try {
    const userId = req.user.id;
    const remarks = (req.body && req.body.remarks) ? req.body.remarks : '';
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.hostEligibilityStatus && user.hostEligibilityStatus.status === 'pending') {
      return res.status(400).json({ error: 'Host request already pending.' });
    }
    if (user.roles.includes('host')) {
      return res.status(400).json({ error: 'User is already a host.' });
    }
    user.hostEligibilityStatus = {
      status: 'pending',
      requestedAt: new Date(),
      remarks
    };
    await user.save();
    
    // Notify platform admins about new host request
    await notifyHostRequest(userId, user.name, user.email);
    
    return res.json({ message: 'Host request submitted.', user: sanitizeUser(user) });
  } catch (err) {
    logger.error('RequestHostAccess error:', err);
    return res.status(500).json({ error: 'Server error requesting host access.' });
  }
}

// Approve host request (verifier only)
async function approveHostRequest(req, res) {
  try {
    if (!req.user.roles.includes('verifier')) {
      return res.status(403).json({ error: 'Only verifiers can approve host requests.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.hostEligibilityStatus || user.hostEligibilityStatus.status !== 'pending') {
      return res.status(400).json({ error: 'No pending host request for this user.' });
    }
    user.hostEligibilityStatus.status = 'approved';
    user.hostEligibilityStatus.approvedBy = req.user.id;
    user.hostEligibilityStatus.approvedAt = new Date();
    user.hostEligibilityStatus.remarks = req.body.remarks || 'Approved by verifier';
    user.canHost = true;
    if (!user.roles.includes('host')) user.roles.push('host');
    await user.save();
    
    // Notify user about host request approval
    await notifyHostStatusUpdate(user._id, user.name, user.email, 'approved', req.body.remarks);
    
    return res.json({ message: 'Host request approved.', user: sanitizeUser(user) });
  } catch (err) {
    logger.error('ApproveHostRequest error:', err);
    return res.status(500).json({ error: 'Server error approving host request.' });
  }
}

// Reject host request (verifier only)
async function rejectHostRequest(req, res) {
  try {
    if (!req.user.roles.includes('verifier')) {
      return res.status(403).json({ error: 'Only verifiers can reject host requests.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!user.hostEligibilityStatus || user.hostEligibilityStatus.status !== 'pending') {
      return res.status(400).json({ error: 'No pending host request for this user.' });
    }
    user.hostEligibilityStatus.status = 'rejected';
    user.hostEligibilityStatus.approvedBy = req.user.id;
    user.hostEligibilityStatus.approvedAt = new Date();
    user.hostEligibilityStatus.remarks = req.body.remarks || 'Rejected by verifier';
    user.canHost = false;
    user.roles = user.roles.filter(r => r !== 'host');
    await user.save();
    
    // Notify user about host request rejection
    await notifyHostStatusUpdate(user._id, user.name, user.email, 'rejected', req.body.remarks);
    
    return res.json({ message: 'Host request rejected.', user: sanitizeUser(user) });
  } catch (err) {
    logger.error('RejectHostRequest error:', err);
    return res.status(500).json({ error: 'Server error rejecting host request.' });
  }
}

// List all pending host requests (verifier only)
async function listPendingHostRequests(req, res) {
  try {
    if (!req.user.roles.includes('verifier')) {
      return res.status(403).json({ error: 'Only verifiers can view host requests.' });
    }
    const pendingUsers = await User.find({ 'hostEligibilityStatus.status': 'pending' }).select('-passwordHash');
    return res.json(pendingUsers);
  } catch (err) {
    logger.error('ListPendingHostRequests error:', err);
    return res.status(500).json({ error: 'Server error listing host requests.' });
  }
}

// Helper to remove sensitive fields before sending user
function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  return obj;
}

/**
 * POST /forgot-password
 * Initiate password reset: send email with reset token
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required.' });
    
    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' }); // Don't reveal user existence
    
    const token = crypto.randomBytes(32).toString('hex');
    
    try {
      await redisClient.setEx(`reset:${token}`, 3600, email); // 1 hour expiry
      
      // Send email with reset link (replace with your frontend URL)
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      await emailService.sendMail({
        to: user.email,
        subject: 'Password Reset',
        text: `Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
      });
      
      return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (emailError) {
      logger.error('Email sending failed in forgotPassword:', emailError);
      return res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
    }
  } catch (err) {
    logger.error('ForgotPassword error:', err);
    return res.status(500).json({ error: 'Server error during password reset.' });
  }
}
/**
 * POST /reset-password
 * Reset password with token
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required.' });
    
    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    
    const email = await redisClient.get(`reset:${token}`);
    if (!email) return res.status(400).json({ error: 'Invalid or expired token.' });
    
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Update user password
    user.passwordHash = passwordHash;
    await user.save();
    
    // Delete reset token
    await redisClient.del(`reset:${token}`);
    
    return res.json({ message: 'Password reset successful.' });
  } catch (err) {
    logger.error('ResetPassword error:', err);
    return res.status(500).json({ error: 'Server error during password reset.' });
  }
}

// Update deleteUser: if user deletes self, mark for deletion in 30 days
async function deleteUser(req, res) {
  try {
    const userId = req.params.id;
    
    // Validate user ID
    if (!userId || !require('mongoose').Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Check if user has active events or certificates
    const activeEvents = await require('../Models/Event').countDocuments({ hostUserId: userId });
    const certificates = await require('../Models/Certificate').countDocuments({ userId });
    
    if (activeEvents > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete user with active events. Please transfer or cancel events first.' 
      });
    }
    
    // Soft delete - mark for deletion instead of hard delete
    user.deletionRequestedAt = new Date();
    user.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    await user.save();
    
    return res.json({ 
      message: 'User marked for deletion. Will be permanently deleted in 30 days.',
      deletionDate: user.deletionScheduledFor
    });
  } catch (err) {
    logger.error('DeleteUser error:', err);
    return res.status(500).json({ error: 'Server error deleting user.' });
  }
}

// Referral and Badge Logic
async function trackReferral(req, res) {
  try {
    const { referrerId } = req.body;
    
    if (!referrerId) {
      return res.status(400).json({ error: 'Referrer ID is required.' });
    }
    
    // Check if referrer exists
    const referrer = await User.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ error: 'Referrer not found.' });
    }
    
    // Update referrer's stats
    referrer.referralStats.successfulSignups += 1;
    await referrer.save();
    
    // Award badge to referrer if they reach milestones
    await awardReferralBadges(referrer);
    
    return res.json({ message: 'Referral tracked successfully.' });
  } catch (err) {
    logger.error('Track referral error:', err);
    return res.status(500).json({ error: 'Server error tracking referral.' });
  }
}

async function awardReferralBadges(user) {
  try {
    const { successfulSignups } = user.referralStats;
    
    // Award badges based on referral milestones
    if (successfulSignups >= 10 && !user.badges.includes('Super Referrer')) {
      user.badges.push('Super Referrer');
      await user.save();
      
      // Create achievement record
      await Achievement.create({
        userId: user._id,
        title: 'Super Referrer',
        badgeIcon: '🏆',
        points: 100,
        earnedAt: new Date()
      });
    } else if (successfulSignups >= 5 && !user.badges.includes('Active Referrer')) {
      user.badges.push('Active Referrer');
      await user.save();
      
      await Achievement.create({
        userId: user._id,
        title: 'Active Referrer',
        badgeIcon: '⭐',
        points: 50,
        earnedAt: new Date()
      });
    } else if (successfulSignups >= 1 && !user.badges.includes('First Referral')) {
      user.badges.push('First Referral');
      await user.save();
      
      await Achievement.create({
        userId: user._id,
        title: 'First Referral',
        badgeIcon: '🎯',
        points: 10,
        earnedAt: new Date()
      });
    }
  } catch (err) {
    logger.error('Award referral badges error:', err);
  }
}

async function awardEventBadges(user) {
  try {
    const hostedCount = user.eventHistory.hosted.length;
    const attendedCount = user.eventHistory.attended.length;
    
    // Award badges based on event participation
    if (hostedCount >= 5 && !user.badges.includes('Event Organizer')) {
      user.badges.push('Event Organizer');
      await user.save();
      
      await Achievement.create({
        userId: user._id,
        title: 'Event Organizer',
        badgeIcon: '🎪',
        points: 200,
        earnedAt: new Date()
      });
    }
    
    if (attendedCount >= 10 && !user.badges.includes('Event Enthusiast')) {
      user.badges.push('Event Enthusiast');
      await user.save();
      
      await Achievement.create({
        userId: user._id,
        title: 'Event Enthusiast',
        badgeIcon: '🎉',
        points: 150,
        earnedAt: new Date()
      });
    }
    
    if (attendedCount >= 1 && !user.badges.includes('First Event')) {
      user.badges.push('First Event');
      await user.save();
      
      await Achievement.create({
        userId: user._id,
        title: 'First Event',
        badgeIcon: '🎊',
        points: 25,
        earnedAt: new Date()
      });
    }
  } catch (err) {
    logger.error('Award event badges error:', err);
  }
}

// Get user badges and achievements
async function getUserBadges(req, res) {
  try {
    const userId = req.params.id || req.user.id;
    
    const user = await User.findById(userId).select('badges');
    const achievements = await Achievement.find({ userId }).sort({ earnedAt: -1 });
    
    return res.json({
      badges: user.badges,
      achievements
    });
  } catch (err) {
    logger.error('Get user badges error:', err);
    return res.status(500).json({ error: 'Server error fetching badges.' });
  }
}



// ---------------- Resend OTP ----------------
async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    // Check if user exists and is not verified
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'User is already verified.' });
    }

    // Generate new OTP
    const otp = await otpService.generateOtp(email);
    
    try {
      await emailService.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Verification Code',
        text: `Your verification code is: ${otp}. Please enter it within 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">CampVerse Verification Code</h2>
            <p>Hello ${user.name},</p>
            <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
            <p>Please enter this code within 10 minutes to complete your registration.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message from CampVerse.</p>
          </div>
        `
      });
      console.log(`Email resent successfully to ${email}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message);
      return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
    }
    
    return res.status(200).json({ message: 'OTP resent to email.' });
  } catch (err) {
    logger.error('Resend OTP error:', err);
    return res.status(500).json({ error: 'Server error during OTP resend. Please try again.' });
  }
}

module.exports = {
  register,
  verifyOtp,
  login,
  updatePreferences,
  getMe,
  updateMe,
  getUserById,
  updateUserById,
  deleteUser,
  getUserCertificates,
  getUserAchievements,
  getUserEvents,
  grantHostAccess,
  grantVerifierAccess,
  googleSignIn,
  forgotPassword,
  resetPassword,
  getDashboard,
  trackReferral,
  getUserBadges,
  requestHostAccess,
  approveHostRequest,
  rejectHostRequest,
  listPendingHostRequests,
  resendOtp,
  completeProfile,
  requestInstitutionVerification
};
