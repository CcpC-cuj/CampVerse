const User = require('../Models/User');
const Certificate = require('../Models/Certificate');
const Achievement = require('../Models/Achievement');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { otpgenrater } = require('../Services/otp');
const { emailsender } = require('../Services/email');
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
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Academic email domain check (.ac.in or .edu.in, flexible for subdomains)
const isAcademicEmail = (email) => /@[\w.-]+\.(ac|edu)\.in$/i.test(email);

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis', // Use Docker Compose service name
    port: process.env.REDIS_PORT || 6379
  }
});
redisClient.on('error', err => console.error('Redis Client Error', err));
(async () => {
  if (!redisClient.isOpen) await redisClient.connect();
  console.log('Redis connected');
})();

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
        return res.status(400).json({ error: 'Only academic emails (.ac.in or .edu.in) are allowed.', forceLogout: true });
      }
      let user = await User.findOne({ email: mockEmail });
      if (!user) {
        // Generate a random password hash for Google users
        const randomPassword = 'google_user_' + Date.now();
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = new User({
          name: mockName,
          email: mockEmail,
          phone: '1234567890',
          profilePhoto: '',
          passwordHash: passwordHash,
          roles: ['student'],
          isVerified: true,
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
        user: sanitizeUser(user)
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
        return res.status(400).json({ error: 'Only academic emails (.ac.in or .edu.in) are allowed.', forceLogout: true });
      }
      let user = await User.findOne({ email });
      if (!user) {
        // Generate a random password hash for Google users
        const randomPassword = 'google_user_' + Date.now();
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = new User({
          name: name || email.split('@')[0],
          email,
          phone: '',
          profilePhoto: picture || '',
          passwordHash: passwordHash,
          roles: ['student'],
          isVerified: true,
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
        user: sanitizeUser(user)
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

// ---------------- Register ----------------
async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password)
      return res.status(400).json({ error: 'All fields (name, email, phone, password) required.' });

    if (!isAcademicEmail(email))
      return res.status(400).json({ error: 'Only academic emails (.ac.in or .edu.in) are allowed.' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists.' });

    const otp = otpgenrater();
    
    // For testing purposes, skip email sending and log OTP
    
    try {
      await emailsender(name, email, otp);
    } catch (emailError) {
      console.log('Email sending failed, but continuing with OTP storage:', emailError.message);
    }

    const tempData = { name, phone, password, otp };
    await redisClient.setEx(email, 600, JSON.stringify(tempData));

    return res.status(200).json({ message: 'OTP sent to email.', otp: otp }); // Include OTP in response for testing
  } catch (err) {
    logger.error('Register error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
}
// Verify OTP
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required.' });

    const tempStr = await redisClient.get(email);
    if (!tempStr) return res.status(400).json({ error: 'OTP expired or invalid.' });

    const tempData = JSON.parse(tempStr);
    if (tempData.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

    let user = await User.findOne({ email });

    if (user) {
      // Existing user login
      await redisClient.del(email);
      const token = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.json({
        message: 'OTP verified, logged in.',
        token,
        user: sanitizeUser(user)
      });
    }

    // New user registration
    const passwordHash = await bcrypt.hash(tempData.password, 10);
    user = new User({
      name: tempData.name,
      email,
      phone: tempData.phone,
      passwordHash,
      roles: ['student'],
      isVerified: false,
      canHost: false,
      createdAt: new Date()
    });

    await user.save();
    await redisClient.del(email);

    const token = jwt.sign({ id: user._id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(201).json({
      message: 'Registration successful, logged in.',
      token,
      user: sanitizeUser(user)
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

    // Only allow specific fields update
    const allowedFields = ['collegeIdNumber', 'interests', 'skills', 'learningGoals', 'badges', 'location'];
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
    // Only allow safe fields to be updated
    const allowedFields = ['name', 'phone', 'Gender', 'DOB', 'profilePhoto', 'collegeIdNumber', 'interests', 'skills', 'learningGoals', 'badges'];
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

    // Profile completion calculation
    const requiredFields = ['name', 'email', 'phone', 'Gender', 'DOB', 'profilePhoto', 'collegeIdNumber'];
    let filled = 0;
    requiredFields.forEach(f => { if (user[f]) filled++; });
    const profileCompletion = Math.round((filled / requiredFields.length) * 100);

    // Stats
    const stats = {
      totalAttended: user.eventHistory.attended.length,
      totalHosted: user.eventHistory.hosted.length,
      totalSaved: user.eventHistory.saved.length,
      totalWaitlisted: user.eventHistory.waitlisted.length,
      certificates: user.certificates ? user.certificates.length : 0, // If certificates are embedded
      achievements: user.achievements ? user.achievements.length : 0, // If achievements are embedded
      referralStats: user.referralStats,
      profileCompletion,
      isHost: user.roles.includes('host'),
      isVerifier: user.roles.includes('verifier'),
      hostEligibilityStatus: user.hostEligibilityStatus,
      verifierEligibilityStatus: user.verifierEligibilityStatus,
      lastLogin: user.lastLogin,
      accountCreated: user.createdAt
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
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' }); // Don't reveal user existence
    const token = crypto.randomBytes(32).toString('hex');
    await redisClient.setEx(`reset:${token}`, 3600, email); // 1 hour expiry
    // Send email with reset link (replace with your frontend URL)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await emailsender(user.name, user.email, `Reset your password: ${resetUrl}`);
    return res.status(200).json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    logger.error('ForgotPassword error:', err);
    return res.status(500).json({ error: 'Server error during password reset request.' });
  }
}
/**
 * POST /reset-password
 * Reset password using token
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required.' });
    const email = await redisClient.get(`reset:${token}`);
    if (!email) return res.status(400).json({ error: 'Invalid or expired token.' });
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found.' });
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    await redisClient.del(`reset:${token}`);
    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    logger.error('ResetPassword error:', err);
    return res.status(500).json({ error: 'Server error during password reset.' });
  }
}

// Update deleteUser: if user deletes self, mark for deletion in 30 days
async function deleteUser(req, res) {
  try {
    // If admin, allow immediate delete
    if (req.user.roles.includes('platformAdmin')) {
      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'User not found.' });
      return res.json({ message: 'User deleted.' });
    }
    // If user is deleting self, mark for deletion in 30 days
    if (req.user.id === req.params.id) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found.' });
      user.deletionRequestedAt = new Date();
      user.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await user.save();
      return res.json({ message: 'Account deletion requested. Your profile will be deleted in 30 days.' });
    }
    return res.status(403).json({ error: 'Forbidden: only admin or self can delete.' });
  } catch (err) {
    logger.error('DeleteUser error:', err);
    return res.status(500).json({ error: 'Server error deleting user.' });
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
  getDashboard
};
