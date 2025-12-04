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
/* eslint-disable quotes */
const User = require('../Models/User');
const Certificate = require('../Models/Certificate');
const Achievement = require('../Models/Achievement');
const EventParticipationLog = require('../Models/EventParticipationLog');
const Event = require('../Models/Event');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Use the simple, existing OTP generator without extra wrappers
const { otpgenrater } = require('../Services/otp');
let emailService;
try {
  const emailModule = require('../Services/email');
  if (typeof emailModule.createEmailService === 'function') {
    emailService = emailModule.createEmailService();
  } else {
    emailService = { sendMail: async () => true };
  }
} catch (e) {
  emailService = { sendMail: async () => true };
}
const {
  notifyHostRequest,
  notifyHostStatusUpdate,
} = require('../Services/notification');
const { createClient } = require('redis');
const { OAuth2Client } = require('google-auth-library');
const winston = require('winston');
const { uploadProfilePhoto, deleteProfilePhoto } = require('../Services/driveService');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});
const crypto = require('crypto');

// const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID; // not used directly

// Academic email domain check (.ac.in or .edu.in, flexible for subdomains)
const isAcademicEmail = (email) =>
  /@[\w.-]+\.(ac|edu)\.in$/i.test(email) || /@[\w.-]+\.edu$/i.test(email);

function extractDomain(email) {
  return email.split('@')[1].toLowerCase();
}

async function findOrCreateInstitution(domain) {
  const Institution = require('../Models/Institution');
  // Don't create institutions automatically - let users request them
  const institution = await Institution.findOne({ emailDomain: domain });
  return institution; // Return null if no institution exists
}

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
});
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
(async () => {
  if (!redisClient.isOpen) await redisClient.connect();
  logger.info('Redis connected');
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

const { validatePassword } = require('../Utils/passwordUtils');

function validateName(name) {
  return name && name.trim().length >= 2;
}

// ---------------- Google Sign-In ----------------
async function googleSignIn(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Google token missing.' });
    }

    // Handle mock tokens for testing
    if (token.startsWith('mock_google_token_')) {
      // Extract email and name from token if present
      let mockEmail = 'test.user@cuj.ac.in';
      let mockName = 'Test User';
      const parts = token.split('__');
      if (parts.length === 2) {
        mockEmail = parts[1];
        mockName = mockEmail
          .split('@')[0]
          .replace(/\./g, ' ')
          .replace(/\d+/g, '')
          .replace(/(^|\s)\S/g, (l) => l.toUpperCase());
      }
      if (!isAcademicEmail(mockEmail)) {
        return res
          .status(400)
          .json({
            error:
              "Only academic emails (.ac.in, .edu.in, or .edu) are allowed.",
            forceLogout: true,
          });
      }
      let user = await User.findOne({ email: mockEmail });
      if (!user) {
        // Create Google-first account with cryptographically secure password
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = new User({
          name: mockName,
          email: mockEmail,
          phone: "",
          profilePhoto: "",
          passwordHash,
          passwordSetup: false,
          roles: ["student"],
          isVerified: true,
          canHost: false,
          googleLinked: true,
          authMethods: ["google"],
          primaryAuthMethod: "google",
          createdAt: new Date(),
        });
        await user.save();
      } else {
        if (!user.googleLinked) user.googleLinked = true;
        user.authMethods = Array.isArray(user.authMethods)
          ? user.authMethods
          : [];
        if (!user.authMethods.includes("google"))
          user.authMethods.push("google");
      }
      user.lastLogin = new Date();
      await user.save();
      const jwtToken = jwt.sign(
        { id: user._id, roles: user.roles, name: user.name },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
          issuer: "campverse",
          audience: "campverse-users",
        },
      );
      logger.info("Mock Google login successful for user:", { email: mockEmail, timestamp: new Date().toISOString() });
      
      return res.json({
        message: "Google login successful (mock)",
        token: jwtToken,
        user: sanitizeUser(user),
      });
    }

    // Real Google OAuth implementation
    try {
      let email, name, picture;
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const oauthClient = new OAuth2Client(clientId);
      // First try treating the token as an ID token (most frontends provide this)
      try {
        const ticket = await oauthClient.verifyIdToken({
          idToken: token,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      } catch (e) {
        // Fallback: treat token as an access token and call userinfo
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`,
        );
        if (!userInfoResponse.ok) {
          throw new Error("Failed to fetch user info from Google");
        }
        const userInfo = await userInfoResponse.json();
        email = userInfo.email;
        name = userInfo.name;
        picture = userInfo.picture;
      }

      if (!email) {
        return res.status(400).json({ error: "Email not provided by Google." });
      }
      if (!isAcademicEmail(email)) {
        return res
          .status(400)
          .json({
            error:
              "Only academic emails (.ac.in, .edu.in, or .edu) are allowed.",
            forceLogout: true,
          });
      }
      let user = await User.findOne({ email });
      if (!user) {
        // Create Google-first account with cryptographically secure password
        const crypto = require('crypto');
        const randomPassword = crypto.randomBytes(32).toString('hex');
        const passwordHash = await bcrypt.hash(randomPassword, 10);
        user = new User({
          name: name || email.split("@")[0],
          email,
          phone: "",
          profilePhoto: picture || "",
          passwordHash,
          // Explicitly mark that password isn't user-set yet
          passwordSetup: false,
          roles: ["student"],
          isVerified: true,
          canHost: false,
          googleLinked: true,
          authMethods: ["google"],
          primaryAuthMethod: "google",
          createdAt: new Date(),
        });
        await user.save();
      } else {
        // User exists - update profile photo if provided and user doesn't have one
        if (picture && !user.profilePhoto) {
          user.profilePhoto = picture;
        }
        // Update name if Google provides a better one (longer/more complete)
        if (name && name.length > user.name.length) {
          user.name = name;
        }
        // Mark as Google linked if not already
        if (!user.googleLinked) user.googleLinked = true;
        // Ensure authMethods reflect Google capability
        user.authMethods = Array.isArray(user.authMethods)
          ? user.authMethods
          : [];
        if (!user.authMethods.includes("google"))
          user.authMethods.push("google");
      }
      user.lastLogin = new Date();
      await user.save();
      const jwtToken = jwt.sign(
        { id: user._id, roles: user.roles, name: user.name },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
          issuer: "campverse",
          audience: "campverse-users",
        },
      );
      
      logger.info("Google login successful for user:", { email, timestamp: new Date().toISOString() });
      
      return res.json({
        message: "Google login successful",
        token: jwtToken,
        user: sanitizeUser(user),
      });
    } catch (googleError) {
      logger.error("Google token verification failed:", { error: googleError.message, timestamp: new Date().toISOString() });
      logger.error("Google token verification failed:", googleError);
      return res.status(401).json({ error: "Invalid Google token." });
    }
  } catch (err) {
    logger.error("Google Login Error:", err);
    return res.status(500).json({ error: "Google login failed." });
  }
}

// ---------------- Setup Password for Google Users ----------------
async function setupPasswordForGoogleUser(req, res) {
  try {
    const { newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // If password is already set up, disallow here
    if (user.passwordSetup) {
      return res
        .status(400)
        .json({
          error: "Password is already set. Use change password instead.",
        });
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.",
      });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user with new password and mark as verified
    user.passwordHash = passwordHash;
    user.passwordSetup = true;
    user.isVerified = true;
    user.googleLinked = true; // ensure dual login capability
    user.authMethods = Array.isArray(user.authMethods) ? user.authMethods : [];
    if (!user.authMethods.includes("password"))
      user.authMethods.push("password");
    if (!user.primaryAuthMethod) user.primaryAuthMethod = "password";
    await user.save();

    return res.json({
      message:
        "Password set up successfully. You can now use email/password login.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("Setup Password Error:", err);
    return res.status(500).json({ error: "Failed to set up password." });
  }
}

// ---------------- Change Password (for all users) ----------------
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Verify current password
    const validPass = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPass) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.",
      });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    return res.json({
      message: "Password changed successfully.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("Change Password Error:", err);
    return res.status(500).json({ error: "Failed to change password." });
  }
}

// ---------------- Send OTP for Google User Verification ----------------
async function sendOtpForGoogleUser(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Check if user is already verified
    if (user.isVerified) {
      return res.status(400).json({
        error: "Account is already verified.",
      });
    }

    // Generate and send OTP
    const otp = otpgenrater();

    try {
      await emailService.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Verify Your CampVerse Account",
        text: `Your verification code is: ${otp}. Please enter it within 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">CampVerse Account Verification</h2>
            <p>Hello ${user.name},</p>
            <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
            <p>Please enter this code within 5 minutes to verify your account.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message from CampVerse.</p>
          </div>
        `,
      });

      // Store OTP in Redis with user ID
      await redisClient.setEx(
        `verify_google_user:${userId}`,
        300,
        JSON.stringify({ otp, email: user.email }),
      );

      return res.json({
        message: "Verification code sent to your email.",
        note: "Enter the code to verify your account.",
      });
    } catch (emailError) {
      logger.error("Email sending failed:", emailError.message);
      return res.status(500).json({
        error: "Failed to send verification email. Please try again.",
      });
    }
  } catch (err) {
    logger.error("Send OTP for Google User Error:", err);
    return res.status(500).json({ error: "Failed to send verification code." });
  }
}

// ---------------- Verify OTP for Google User ----------------
async function verifyOtpForGoogleUser(req, res) {
  try {
    const { otp } = req.body;
    const userId = req.user.id;

    if (!otp) {
      return res.status(400).json({ error: "OTP is required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Get stored OTP from Redis
    const storedData = await redisClient.get(`verify_google_user:${userId}`);
    if (!storedData) {
      return res
        .status(400)
        .json({ error: "OTP expired or not found. Please request a new one." });
    }

    const { otp: storedOtp } = JSON.parse(storedData);

    if (storedOtp !== otp) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    // Verify the user account
    user.isVerified = true;
    await user.save();

    // Clear the OTP from Redis
    await redisClient.del(`verify_google_user:${userId}`);

    return res.json({
      message: "Account verified successfully!",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("Verify OTP for Google User Error:", err);
    return res.status(500).json({ error: "Failed to verify account." });
  }
}

// ---------------- Get User Authentication Status ----------------
async function getAuthStatus(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const hasPassword = !!user.passwordSetup;

    return res.json({
      hasPassword,
      isVerified: user.isVerified,
      googleLinked: user.googleLinked,
      canUseEmailLogin: hasPassword,
      canUseGoogleLogin: true, // All users can use Google login
      needsVerification: !user.isVerified,
      needsPasswordSetup: !hasPassword,
    });
  } catch (err) {
    logger.error("Get Auth Status Error:", err);
    return res
      .status(500)
      .json({ error: "Failed to get authentication status." });
  }
}

// ---------------- Link Google Account ----------------
async function linkGoogleAccount(req, res) {
  try {
    const { email, password, googleToken } = req.body;

    if (!email || !password || !googleToken) {
      return res.status(400).json({
        error: "Email, password, and Google token are required.",
      });
    }

    // First verify the user's email/password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    // Verify Google token and extract Google account info
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const oauthClient = new OAuth2Client(clientId);

      let googleEmail, googleName, googlePicture;
      try {
        const ticket = await oauthClient.verifyIdToken({
          idToken: googleToken,
          audience: clientId,
        });
        const payload = ticket.getPayload();
        googleEmail = payload.email;
        googleName = payload.name;
        googlePicture = payload.picture;
      } catch (e) {
        // Fallback: treat token as access token
        const userInfoResponse = await fetch(
          `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${googleToken}`,
        );
        if (!userInfoResponse.ok) {
          throw new Error("Failed to fetch user info from Google");
        }
        const userInfo = await userInfoResponse.json();
        googleEmail = userInfo.email;
        googleName = userInfo.name;
        googlePicture = userInfo.picture;
      }

      // Verify Google email matches user email
      if (googleEmail.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({
          error:
            "Google account email must match your registered email address.",
        });
      }

      // Update user with Google profile info
      if (googlePicture && !user.profilePhoto) {
        user.profilePhoto = googlePicture;
      }
      if (googleName && googleName.length > user.name.length) {
        user.name = googleName;
      }

      // Mark that this user can now use Google login
      user.googleLinked = true;
      user.authMethods = Array.isArray(user.authMethods)
        ? user.authMethods
        : [];
      if (!user.authMethods.includes("google")) user.authMethods.push("google");
      if (!user.primaryAuthMethod) user.primaryAuthMethod = "password";
      await user.save();

      return res.json({
        message:
          "Google account linked successfully. You can now use Google login.",
        user: sanitizeUser(user),
      });
    } catch (googleError) {
      logger.error("Google token verification failed:", googleError);
      return res.status(401).json({ error: "Invalid Google token." });
    }
  } catch (err) {
    logger.error("Link Google Account Error:", err);
    return res.status(500).json({ error: "Failed to link Google account." });
  }
}

// ---------------- Register ----------------
async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body;

    // Comprehensive validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        error: "All fields (name, email, phone, password) are required.",
        missing: {
          name: !name,
          email: !email,
          phone: !phone,
          password: !password,
        },
      });
    }

    if (!validateName(name)) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters long." });
    }

    if (!validateEmail(email)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid email address." });
    }

    if (!isAcademicEmail(email)) {
      return res
        .status(400)
        .json({
          error: "Only academic emails (.ac.in, .edu.in, or .edu) are allowed.",
        });
    }

    if (!validatePhone(phone)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid 10-digit phone number." });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists." });
    }

    const otp = otpgenrater();

    let emailSent = false;
    try {
      await emailService.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}. Please enter it within 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">CampVerse Verification Code</h2>
            <p>Hello ${name},</p>
            <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
            <p>Please enter this code within 5 minutes to complete your registration.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message from CampVerse.</p>
          </div>
        `,
      });
      logger.info(`Email sent successfully to ${email}`);
      emailSent = true;
    } catch (emailError) {
      logger.error("Email sending failed:", emailError.message);
      logger.error("Email error details:", emailError);
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Development mode: Proceeding without email verification');
        emailSent = true;
      } else {
        return res.status(500).json({ error: "Failed to send verification email. Please check your email configuration." });
      }
    }

    if (emailSent) {
      const domain = extractDomain(email);
      const institution = await findOrCreateInstitution(domain);
      const tempData = {
        name,
        phone,
        password,
        otp,
        institutionId: institution ? institution._id : null,
        institutionIsVerified: institution ? institution.isVerified : "none",
      };
      await redisClient.setEx(email, 600, JSON.stringify(tempData));
      return res.status(200).json({ message: "OTP sent to email." });
    }
  } catch (err) {
    logger.error("Register error:", err);
    return res
      .status(500)
      .json({ error: "Server error during registration. Please try again." });
  }
}
// Verify OTP
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ error: "Email and OTP required." });

    const tempStr = await redisClient.get(email);
    if (!tempStr)
      return res.status(400).json({ error: "OTP expired or invalid." });

    const tempData = JSON.parse(tempStr);
    if (tempData.locked)
      return res
        .status(429)
        .json({ error: "Too many failed attempts. Please request a new OTP." });
    tempData.retryCount = tempData.retryCount || 0;
    if (tempData.otp !== otp) {
      tempData.retryCount++;
      if (tempData.retryCount >= 5) {
        tempData.locked = true;
        await redisClient.setEx(email, 600, JSON.stringify(tempData));
        return res
          .status(429)
          .json({
            error: "Too many failed attempts. Please request a new OTP.",
          });
      }
      await redisClient.setEx(email, 600, JSON.stringify(tempData));
      return res.status(400).json({ error: "Invalid OTP." });
    }

    let user = await User.findOne({ email });

    if (user) {
      // Existing user: if password not set yet (Google-first), set it now from tempData
      if (!user.passwordSetup && tempData && tempData.password) {
        user.passwordHash = await bcrypt.hash(tempData.password, 10);
        user.passwordSetup = true;
        user.authMethods = Array.isArray(user.authMethods)
          ? user.authMethods
          : [];
        if (!user.authMethods.includes("password"))
          user.authMethods.push("password");
        if (!user.primaryAuthMethod) user.primaryAuthMethod = "password";
        await user.save();
      }
      await redisClient.del(email);
      const token = jwt.sign(
        { id: user._id, roles: user.roles, name: user.name },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
          issuer: "campverse",
          audience: "campverse-users",
        },
      );
      return res.json({
        message: "OTP verified, logged in.",
        token,
        user: sanitizeUser(user),
      });
    }

    // New user registration - no automatic institution creation
    const passwordHash = await bcrypt.hash(tempData.password, 10);
    user = new User({
      name: tempData.name,
      email,
      phone: tempData.phone,
      passwordHash,
      passwordSetup: true,
      roles: ["student"],
      isVerified: false,
      canHost: false,
      createdAt: new Date(),
      authMethods: ["password"],
      primaryAuthMethod: "password",
      // Don't set institutionId automatically - user must request institution
      institutionVerificationStatus: "pending", // No institution requested yet
    });

    await user.save();
    await redisClient.del(email);

    const token = jwt.sign(
      { id: user._id, roles: user.roles, name: user.name },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "campverse",
        audience: "campverse-users",
      },
    );
    return res.status(201).json({
      message: "Registration successful, logged in.",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("Verify OTP error:", err);
    return res
      .status(500)
      .json({ error: "Server error during OTP verification." });
  }
}

// Login with email & password
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found." });

    const validPass = await bcrypt.compare(password, user.passwordHash);
    if (!validPass)
      return res.status(400).json({ error: "Incorrect password." });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, roles: user.roles, name: user.name },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "campverse",
        audience: "campverse-users",
      },
    );

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login." });
  }
}

// Update user preferences (POST /updatePreferences)
async function updatePreferences(req, res) {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Allow all profile fields to be updated
    const allowedFields = [
      "name",
      "phone",
      "gender",
      "dateOfBirth",
      "profilePhoto",
      "collegeIdNumber",
      "interests",
      "skills",
      "learningGoals",
      "badges",
      "location",
      "bio",
    ];
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) filteredUpdates[key] = updates[key];
    }

    const updatedUser = await User.findByIdAndUpdate(userId, filteredUpdates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!updatedUser) return res.status(404).json({ error: "User not found." });

    return res.json({ message: "Preferences updated.", user: updatedUser });
  } catch (err) {
    logger.error("Update preferences error:", err);
    return res
      .status(500)
      .json({ error: "Server error updating preferences." });
  }
}

// Get logged in user profile (GET /me)
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .populate("institutionId", "name isVerified")
      .select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });

    // Ensure institutionId is null if no institution exists
    if (user.institutionId && !user.institutionId._id) {
      user.institutionId = null;
      user.institutionVerificationStatus = "none";
    }

    return res.json(user);
  } catch (err) {
    logger.error("GetMe error:", err);
    return res.status(500).json({ error: "Server error fetching profile." });
  }
}

// PATCH /me — update own profile
async function updateMe(req, res) {
  try {
    const userId = req.user.id;
    const updates = req.body;
    // Allow all profile fields to be updated
    const allowedFields = [
      "name",
      "phone",
      "gender",
      "dateOfBirth",
      "profilePhoto",
      "collegeIdNumber",
      "interests",
      "skills",
      "learningGoals",
      "badges",
      "location",
      "onboardingCompleted",
      "bio",
    ];
    const filteredUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) filteredUpdates[key] = updates[key];
    }
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }
    const updatedUser = await User.findByIdAndUpdate(userId, filteredUpdates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");
    if (!updatedUser) return res.status(404).json({ error: "User not found." });
    return res.json({ message: "Profile updated.", user: updatedUser });
  } catch (err) {
    logger.error("UpdateMe error:", err);
    return res.status(500).json({ error: "Server error updating profile." });
  }
}

// Get user by id (GET /:id)
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json(user);
  } catch (err) {
    logger.error("GetUserById error:", err);
    return res.status(500).json({ error: "Server error fetching user." });
  }
}

// Update user by id (PATCH /:id)
async function updateUserById(req, res) {
  try {
    const updates = req.body;
    // For security, don't allow password or roles update here unless you want to
    if ("passwordHash" in updates) delete updates.passwordHash;

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    if (!updatedUser) return res.status(404).json({ error: "User not found." });
    return res.json({ message: "User updated.", user: updatedUser });
  } catch (err) {
    logger.error("UpdateUserById error:", err);
    return res.status(500).json({ error: "Server error updating user." });
  }
}

/**
 * GET /me/dashboard — User dashboard stats
 */
async function getDashboard(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .populate("eventHistory.hosted")
      .populate("eventHistory.attended")
      .populate("eventHistory.saved")
      .populate("eventHistory.waitlisted")
      .select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });

    // Get certificates count
    const certificatesCount = await Certificate.countDocuments({
      userId: user._id,
    });

    // Get achievements count
    const achievementsCount = await Achievement.countDocuments({
      userId: user._id,
    });

    // Get participation logs for more detailed stats
    const participationLogs = await EventParticipationLog.find({
      userId: user._id,
    }).populate({
      path: 'eventId',
      populate: {
        path: 'hostUserId',
        select: 'name email profilePicture'
      }
    });
    
    const registeredEvents = participationLogs.filter(
      (log) => log.status === "registered",
    ).length;

    // Get registered events with full details for dashboard
    const registeredEventsWithDetails = participationLogs
      .filter(log => log.status === "registered" && log.eventId)
      .map(log => ({
        ...log.eventId.toObject(),
        userRegistration: {
          status: log.status,
          registeredAt: log.registeredAt,
          qrToken: log.qrToken
        }
      }));

    // Upcoming events count for the user (registered and in the future)
    const now = new Date();
    const registeredEventIds = participationLogs
      .filter((log) => log.status === "registered")
      .map((log) => log.eventId);
    let upcomingEventsCount = 0;
    if (registeredEventIds.length > 0) {
      upcomingEventsCount = await Event.countDocuments({
        _id: { $in: registeredEventIds },
        date: { $gt: now },
      });
    }

    // Profile completion calculation
    const requiredFields = [
      "name",
      "email",
      "phone",
      "gender",
      "dateOfBirth",
      "profilePhoto",
      "collegeIdNumber",
    ];
    let filled = 0;
    requiredFields.forEach((f) => {
      if (user[f]) filled++;
    });
    const profileCompletion = Math.round(
      (filled / requiredFields.length) * 100,
    );

    // Enhanced Stats
    const stats = {
      totalAttended: user.eventHistory?.attended?.length || 0,
      totalHosted: user.eventHistory?.hosted?.length || 0,
      totalSaved: user.eventHistory?.saved?.length || 0,
      totalWaitlisted: participationLogs.filter(
        (log) => log.status === "waitlisted",
      ).length,
      totalRegistered: registeredEvents,
      totalParticipationLogs: participationLogs.length,
      certificates: certificatesCount,
      achievements: achievementsCount,
      upcomingEvents: upcomingEventsCount,
      myColleges: user.institutionId ? 1 : 0,
      referralStats: user.referralStats || {
        sharedLinks: 0,
        successfulSignups: 0,
      },
      profileCompletion,
      isHost: user.roles.includes("host"),
      isVerifier: user.roles.includes("verifier"),
      hostEligibilityStatus: user.hostEligibilityStatus,
      verifierEligibilityStatus: user.verifierEligibilityStatus,
      institutionVerificationStatus: user.institutionVerificationStatus,
      lastLogin: user.lastLogin,
      accountCreated: user.createdAt,
      accountAge: Math.floor(
        (Date.now() - user.createdAt) / (1000 * 60 * 60 * 24),
      ), // days since account creation
    };
    
    return res.json({ 
      user, 
      stats,
      events: registeredEventsWithDetails // Include registered events in dashboard response
    });
  } catch (err) {
    logger.error("GetDashboard error:", err);
    return res.status(500).json({ error: "Server error fetching dashboard." });
  }
}

// Get certificates of user (GET /:id/certificates)
async function getUserCertificates(req, res) {
  try {
    const certificates = await Certificate.find({ userId: req.params.id });
    return res.json(certificates);
  } catch (err) {
    logger.error("GetUserCertificates error:", err);
    return res
      .status(500)
      .json({ error: "Server error fetching certificates." });
  }
}

// Get achievements of user (GET /:id/achievements)
async function getUserAchievements(req, res) {
  try {
    const achievements = await Achievement.find({ userId: req.params.id });
    return res.json(achievements);
  } catch (err) {
    logger.error("GetUserAchievements error:", err);
    return res
      .status(500)
      .json({ error: "Server error fetching achievements." });
  }
}

// Get events related to user (hosted, attended, saved, waitlisted) (GET /:id/events)
async function getUserEvents(req, res) {
  try {
    const user = await User.findById(req.params.id)
      .populate("eventHistory.hosted")
      .populate("eventHistory.attended")
      .populate("eventHistory.saved")
      .populate("eventHistory.waitlisted");
    if (!user) return res.status(404).json({ error: "User not found." });

    return res.json({
      hosted: user.eventHistory?.hosted || [],
      attended: user.eventHistory?.attended || [],
      saved: user.eventHistory?.saved || [],
      waitlisted: user.eventHistory?.waitlisted || [],
    });
  } catch (err) {
    logger.error("GetUserEvents error:", err);
    return res
      .status(500)
      .json({ error: "Server error fetching user events." });
  }
}

// Grant host access (platformAdmin only)
async function grantHostAccess(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.canHost = true;
    if (!user.roles.includes("host")) user.roles.push("host");
    user.hostEligibilityStatus = {
      status: "approved",
      approvedBy: req.user.id,
      approvedAt: new Date(),
      remarks: req.body.remarks || "Approved by platform admin",
    };

    await user.save();

    // Notify user about host access granted
    await notifyHostStatusUpdate(
      user._id,
      user.name,
      user.email,
      "approved",
      req.body.remarks,
    );

    return res.json({
      message: "Host access granted.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("GrantHostAccess error:", err);
    return res
      .status(500)
      .json({ error: "Server error granting host access." });
  }
}

// Grant verifier access (POST /:id/grant-verifier) — only platformAdmin middleware should protect
async function grantVerifierAccess(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (!user.roles.includes("verifier")) {
      user.roles.push("verifier");
    }
    user.verifierEligibilityStatus = {
      approvedBy: req.user.id,
      approvedAt: new Date(),
      remarks: req.body.remarks || "Approved by platform admin",
    };

    await user.save();

    return res.json({
      message: "Verifier access granted.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("GrantVerifierAccess error:", err);
    return res
      .status(500)
      .json({ error: "Server error granting verifier access." });
  }
}

// Request host access (user self-request)
async function requestHostAccess(req, res) {
  try {
    const userId = req.user.id;
    const remarks = req.body && req.body.remarks ? req.body.remarks : "";
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (
      user.hostEligibilityStatus &&
      user.hostEligibilityStatus.status === "pending"
    ) {
      return res.status(400).json({ error: "Host request already pending." });
    }
    if (user.roles.includes("host")) {
      return res.status(400).json({ error: "User is already a host." });
    }

    // Handle file uploads with validation and storage based on STORAGE_PROVIDER
    const storageProvider = process.env.STORAGE_PROVIDER || 'firebase';
    const { firebaseStorageService } = require('../Services/firebaseStorageService');
    const { supabaseStorageService } = require('../Services/supabaseStorageService');
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const maxSize = 2 * 1024 * 1024; // 2MB
    let idCardPhotoUrl = "";
    let eventPermissionUrl = "";
    
    if (req.files && req.files.idCardPhoto && req.files.idCardPhoto[0]) {
      const file = req.files.idCardPhoto[0];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: "Invalid ID card photo type. Only JPEG, PNG, and PDF allowed." });
      }
      if (file.size > maxSize) {
        return res.status(400).json({ error: "ID card photo too large (max 2MB)." });
      }
      
      // Upload based on STORAGE_PROVIDER setting
      try {
        if (storageProvider === 'firebase') {
          // Upload to Firebase only
          idCardPhotoUrl = await firebaseStorageService.uploadUserDocument(
            file.buffer,
            file.originalname,
            'id-cards',
            userId,
            file.mimetype
          );
          logger.info(`ID card uploaded to Firebase for user ${userId}`);
        } else if (storageProvider === 'supabase') {
          // Upload to Supabase only
          idCardPhotoUrl = await supabaseStorageService.uploadUserDocument(
            file.buffer,
            file.originalname,
            'id-cards',
            userId,
            file.mimetype
          );
          logger.info(`ID card uploaded to Supabase for user ${userId}`);
        } else {
          // Default to Firebase if provider is unknown
          idCardPhotoUrl = await firebaseStorageService.uploadUserDocument(
            file.buffer,
            file.originalname,
            'id-cards',
            userId,
            file.mimetype
          );
          logger.info(`ID card uploaded to Firebase (default) for user ${userId}`);
        }
      } catch (uploadError) {
        logger.error('Failed to upload ID card:', uploadError);
        return res.status(500).json({ error: "Failed to upload ID card. Please try again." });
      }
    } else {
      return res.status(400).json({ error: "ID card photo is required." });
    }

    if (req.files && req.files.eventPermission && req.files.eventPermission[0]) {
      const file = req.files.eventPermission[0];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: "Invalid event permission file type. Only JPEG, PNG, and PDF allowed." });
      }
      if (file.size > maxSize) {
        return res.status(400).json({ error: "Event permission file too large (max 2MB)." });
      }
      
      // Upload based on STORAGE_PROVIDER setting
      try {
        if (storageProvider === 'firebase') {
          // Upload to Firebase only
          eventPermissionUrl = await firebaseStorageService.uploadUserDocument(
            file.buffer,
            file.originalname,
            'permissions',
            userId,
            file.mimetype
          );
          logger.info(`Event permission uploaded to Firebase for user ${userId}`);
        } else if (storageProvider === 'supabase') {
          // Upload to Supabase only
          eventPermissionUrl = await supabaseStorageService.uploadUserDocument(
            file.buffer,
            file.originalname,
            'permissions',
            userId,
            file.mimetype
          );
          logger.info(`Event permission uploaded to Supabase for user ${userId}`);
        } else {
          // Default to Firebase if provider is unknown
          eventPermissionUrl = await firebaseStorageService.uploadUserDocument(
            file.buffer,
            file.originalname,
            'permissions',
            userId,
            file.mimetype
          );
          logger.info(`Event permission uploaded to Firebase (default) for user ${userId}`);
        }
      } catch (uploadError) {
        logger.error('Failed to upload event permission:', uploadError);
        return res.status(500).json({ error: "Failed to upload event permission. Please try again." });
      }
    }

    user.hostEligibilityStatus = {
      status: "pending",
      requestedAt: new Date(),
      remarks,
    };
    user.hostRequestIdCardPhoto = idCardPhotoUrl;
    user.hostRequestEventPermission = eventPermissionUrl;
    await user.save();

    // Notify platform admins about new host request
    await notifyHostRequest(userId, user.name, user.email);

    return res.json({
      message: "Host request submitted.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("RequestHostAccess error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Server error requesting host access." });
  }
}

// Approve host request (verifier only)
async function approveHostRequest(req, res) {
  try {
    if (!req.user.roles.includes("verifier")) {
      return res
        .status(403)
        .json({ error: "Only verifiers can approve host requests." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (
      !user.hostEligibilityStatus ||
      user.hostEligibilityStatus.status !== "pending"
    ) {
      return res
        .status(400)
        .json({ error: "No pending host request for this user." });
    }
    user.hostEligibilityStatus.status = "approved";
    user.hostEligibilityStatus.approvedBy = req.user.id;
    user.hostEligibilityStatus.approvedAt = new Date();
    user.hostEligibilityStatus.remarks =
      req.body.remarks || "Approved by verifier";
    user.canHost = true;
    if (!user.roles.includes("host")) user.roles.push("host");
    await user.save();

    // Notify user about host request approval
    await notifyHostStatusUpdate(
      user._id,
      user.name,
      user.email,
      "approved",
      req.body.remarks,
    );

    return res.json({
      message: "Host request approved.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("ApproveHostRequest error:", err);
    return res
      .status(500)
      .json({ error: "Server error approving host request." });
  }
}

// Reject host request (verifier only)
async function rejectHostRequest(req, res) {
  try {
    if (!req.user.roles.includes("verifier")) {
      return res
        .status(403)
        .json({ error: "Only verifiers can reject host requests." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (
      !user.hostEligibilityStatus ||
      user.hostEligibilityStatus.status !== "pending"
    ) {
      return res
        .status(400)
        .json({ error: "No pending host request for this user." });
    }
    user.hostEligibilityStatus.status = "rejected";
    user.hostEligibilityStatus.approvedBy = req.user.id;
    user.hostEligibilityStatus.approvedAt = new Date();
    user.hostEligibilityStatus.remarks =
      req.body.remarks || "Rejected by verifier";
    user.canHost = false;
    user.roles = user.roles.filter((r) => r !== "host");
    await user.save();

    // Notify user about host request rejection
    await notifyHostStatusUpdate(
      user._id,
      user.name,
      user.email,
      "rejected",
      req.body.remarks,
    );

    return res.json({
      message: "Host request rejected.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("RejectHostRequest error:", err);
    return res
      .status(500)
      .json({ error: "Server error rejecting host request." });
  }
}

// List all pending host requests (verifier only)
async function listPendingHostRequests(req, res) {
  try {
    if (!req.user.roles.includes("verifier")) {
      return res
        .status(403)
        .json({ error: "Only verifiers can view host requests." });
    }
    const pendingUsers = await User.find({
      "hostEligibilityStatus.status": "pending",
    })
      .select("-passwordHash")
      .populate("institutionId", "name isVerified");
    return res.json(pendingUsers);
  } catch (err) {
    logger.error("ListPendingHostRequests error:", err);
    return res
      .status(500)
      .json({ error: "Server error listing host requests." });
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
    if (!email) return res.status(400).json({ error: "Email required." });
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(200)
        .json({ message: "If the email exists, a reset link has been sent." }); // Don't reveal user existence

    const token = crypto.randomBytes(32).toString("hex");
    const isGoogleUser = user.passwordHash.includes("google_user_");

    // Store token with user info
    await redisClient.setEx(
      `reset:${token}`,
      3600,
      JSON.stringify({
        email,
        isGoogleUser,
        needsSetup: isGoogleUser,
      }),
    ); // 1 hour expiry

    // Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    const subject = isGoogleUser ? "Set Up Your Password" : "Password Reset";
    const text = isGoogleUser
      ? `Click the link below to set up your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
      : `Click the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    await emailService.sendMail({
      to: user.email,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${subject}</h2>
          <p>Hello ${user.name},</p>
          <p>${isGoogleUser ? "Set up your password" : "Reset your password"} by clicking the button below:</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">${isGoogleUser ? "Set Up Password" : "Reset Password"}</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated message from CampVerse.</p>
        </div>
      `,
    });

    return res.status(200).json({
      message: "If the email exists, a reset link has been sent.",
      isGoogleUser,
    });
  } catch (err) {
    logger.error("ForgotPassword error:", err);
    return res
      .status(500)
      .json({ error: "Server error during password reset request." });
  }
}
/**
 * POST /reset-password
 * Reset password using token
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res
        .status(400)
        .json({ error: "Token and new password required." });

    const storedData = await redisClient.get(`reset:${token}`);
    if (!storedData)
      return res.status(400).json({ error: "Invalid or expired token." });

    let email, isGoogleUser, needsSetup;
    try {
      const parsed = JSON.parse(storedData);
      email = parsed.email;
      isGoogleUser = parsed.isGoogleUser;
      needsSetup = parsed.needsSetup;
    } catch (e) {
      // Fallback for old format
      email = storedData;
      isGoogleUser = false;
      needsSetup = false;
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found." });

    // Hash the new password
    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordSetup = true;
    // If this was a Google user setting up password for the first time
    if (isGoogleUser && needsSetup) {
      user.googleLinked = true; // Ensure Google is marked as linked
      user.authMethods = Array.isArray(user.authMethods)
        ? user.authMethods
        : [];
      if (!user.authMethods.includes("password"))
        user.authMethods.push("password");
      if (!user.primaryAuthMethod) user.primaryAuthMethod = "password";
    }

    await user.save();
    await redisClient.del(`reset:${token}`);

    const message =
      isGoogleUser && needsSetup
        ? "Password set up successfully. You can now use both Google and email/password login."
        : "Password reset successful.";

    return res.status(200).json({
      message,
      isGoogleUser,
      needsSetup,
    });
  } catch (err) {
    logger.error("ResetPassword error:", err);
    return res
      .status(500)
      .json({ error: "Server error during password reset." });
  }
}

// ---------------- Settings: Notification Preferences ----------------
async function getMyNotificationPreferences(req, res) {
  try {
    const user = await User.findById(req.user.id).select(
      "notificationPreferences",
    );
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json(user.notificationPreferences || {});
  } catch (err) {
    logger.error("Get Notification Preferences error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch notification preferences." });
  }
}

async function updateMyNotificationPreferences(req, res) {
  try {
    const allowedKeys = [
      "rsvp",
      "certificate",
      "cohost",
      "event_verification",
      "host_request",
    ];

    const updates = { email: {}, inApp: {} };
    if (req.body && typeof req.body === "object") {
      if (req.body.email && typeof req.body.email === "object") {
        for (const key of allowedKeys) {
          if (
            key in req.body.email &&
            typeof req.body.email[key] === "boolean"
          ) {
            updates.email[key] = req.body.email[key];
          }
        }
      }
      if (req.body.inApp && typeof req.body.inApp === "object") {
        for (const key of allowedKeys) {
          if (
            key in req.body.inApp &&
            typeof req.body.inApp[key] === "boolean"
          ) {
            updates.inApp[key] = req.body.inApp[key];
          }
        }
      }
    }

    // Build Mongo update object using dot-notation for provided fields only
    const mongoUpdate = {};
    for (const [channel, channelUpdates] of Object.entries(updates)) {
      for (const [k, v] of Object.entries(channelUpdates)) {
        mongoUpdate[`notificationPreferences.${channel}.${k}`] = v;
      }
    }

    if (Object.keys(mongoUpdate).length === 0) {
      return res
        .status(400)
        .json({ error: "No valid notification preference fields to update." });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { $set: mongoUpdate },
      { new: true },
    ).select("notificationPreferences");

    if (!updated) return res.status(404).json({ error: "User not found." });
    return res.json({
      message: "Notification preferences updated.",
      notificationPreferences: updated.notificationPreferences,
    });
  } catch (err) {
    logger.error("Update Notification Preferences error:", err);
    return res
      .status(500)
      .json({ error: "Failed to update notification preferences." });
  }
}

// ---------------- Logout ----------------
async function logout(req, res) {
  try {
    const token = req.token;
    if (token) {
      // Add token to blacklist with expiration
      const decoded = jwt.decode(token);
      const exp = decoded.exp || Math.floor(Date.now() / 1000) + 3600; // Default 1 hour
      const ttl = exp - Math.floor(Date.now() / 1000);
      
      if (ttl > 0) {
        await redisClient.setEx(`blacklist:${token}`, ttl, 'revoked');
        logger.info(`Token blacklisted for user ${req.user.id}`);
      }
    }
    
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed.' });
  }
}

// ---------------- Settings: Delete My Account (schedule) ----------------
async function deleteMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    user.deletionRequestedAt = new Date();
    user.deletionScheduledFor = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save();
    return res.json({
      message:
        "Account deletion requested. Your profile will be deleted in 30 days.",
    });
  } catch (err) {
    logger.error("DeleteMe error:", err);
    return res
      .status(500)
      .json({ error: "Server error requesting account deletion." });
  }
}

// ---------------- Settings: Unlink Google Account ----------------
async function unlinkGoogleAccount(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    // Ensure the user still has a valid password before unlinking Google
    if (!user.passwordSetup) {
      return res
        .status(400)
        .json({
          error: "Please set a password first before unlinking Google.",
        });
    }

    if (!user.googleLinked) {
      return res.status(400).json({ error: "Google account is not linked." });
    }

    user.googleLinked = false;
    if (Array.isArray(user.authMethods)) {
      user.authMethods = user.authMethods.filter((m) => m !== "google");
    }
    await user.save();
    return res.json({
      message: "Google account unlinked successfully.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("UnlinkGoogleAccount error:", err);
    return res.status(500).json({ error: "Failed to unlink Google account." });
  }
}

// Update deleteUser: if user deletes self, mark for deletion in 30 days
async function deleteUser(req, res) {
  try {
    // If admin, allow immediate delete
    if (req.user.roles.includes("platformAdmin")) {
      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "User not found." });
      return res.json({ message: "User deleted." });
    }
    // If user is deleting self, mark for deletion in 30 days
    if (req.user.id === req.params.id) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found." });
      user.deletionRequestedAt = new Date();
      user.deletionScheduledFor = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ); // 30 days
      await user.save();
      return res.json({
        message:
          "Account deletion requested. Your profile will be deleted in 30 days.",
      });
    }
    return res
      .status(403)
      .json({ error: "Forbidden: only admin or self can delete." });
  } catch (err) {
    logger.error("DeleteUser error:", err);
    return res.status(500).json({ error: "Server error deleting user." });
  }
}

// Referral and Badge Logic
async function trackReferral(req, res) {
  try {
    const { referrerId } = req.body;

    if (!referrerId) {
      return res.status(400).json({ error: "Referrer ID is required." });
    }

    // Check if referrer exists
    const referrer = await User.findById(referrerId);
    if (!referrer) {
      return res.status(404).json({ error: "Referrer not found." });
    }

    // Update referrer's stats
    referrer.referralStats.successfulSignups += 1;
    await referrer.save();

    // Award badge to referrer if they reach milestones
    await awardReferralBadges(referrer);

    return res.json({ message: "Referral tracked successfully." });
  } catch (err) {
    logger.error("Track referral error:", err);
    return res.status(500).json({ error: "Server error tracking referral." });
  }
}

async function awardReferralBadges(user) {
  try {
    const { successfulSignups } = user.referralStats;

    // Award badges based on referral milestones
    if (successfulSignups >= 10 && !user.badges.includes("Super Referrer")) {
      user.badges.push("Super Referrer");
      await user.save();

      // Create achievement record
      await Achievement.create({
        userId: user._id,
        title: "Super Referrer",
        badgeIcon: "🏆",
        points: 100,
        earnedAt: new Date(),
      });
    } else if (
      successfulSignups >= 5 &&
      !user.badges.includes("Active Referrer")
    ) {
      user.badges.push("Active Referrer");
      await user.save();

      await Achievement.create({
        userId: user._id,
        title: "Active Referrer",
        badgeIcon: "⭐",
        points: 50,
        earnedAt: new Date(),
      });
    } else if (
      successfulSignups >= 1 &&
      !user.badges.includes("First Referral")
    ) {
      user.badges.push("First Referral");
      await user.save();

      await Achievement.create({
        userId: user._id,
        title: "First Referral",
        badgeIcon: "🎯",
        points: 10,
        earnedAt: new Date(),
      });
    }
  } catch (err) {
    logger.error("Award referral badges error:", err);
  }
}

// Note: awardEventBadges removed (unused)

// Get user badges and achievements
async function getUserBadges(req, res) {
  try {
    const userId = req.params.id || req.user.id;

    const user = await User.findById(userId).select("badges");
    const achievements = await Achievement.find({ userId }).sort({
      earnedAt: -1,
    });

    return res.json({
      badges: user.badges,
      achievements,
    });
  } catch (err) {
    logger.error("Get user badges error:", err);
    return res.status(500).json({ error: "Server error fetching badges." });
  }
}

// Upload profile photo (multipart/form-data: field name 'photo')
async function uploadProfilePhotoHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    // Delete old profile photo if exists (best-effort)
    if (user.profilePhoto) {
      try {
        logger.info(`Attempting to delete old profile photo: ${user.profilePhoto}`);
        const deleted = await deleteProfilePhoto(user.profilePhoto);
        if (deleted) {
          logger.info(`Successfully deleted old profile photo: ${user.profilePhoto}`);
        } else {
          logger.warn(`Failed to delete old profile photo: ${user.profilePhoto}`);
        }
      } catch (error) {
        logger.error(`Error deleting old profile photo: ${user.profilePhoto}`, error);
        // ignore deletion failures - don't break the upload process
      }
    }
    // Upload new photo to storage
    const url = await uploadProfilePhoto(
      req.file.buffer,
      req.file.originalname,
      req.user.id,
      req.file.mimetype,
    );
    user.profilePhoto = url;
    await user.save();
    return res.json({
      message: "Profile photo updated (stored locally).",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("UploadProfilePhoto error:", err);
    return res.status(500).json({ error: "Failed to upload profile photo." });
  }
}

// Set institution for current user
async function setInstitutionForMe(req, res) {
  try {
    const { institutionId } = req.body || {};
    if (!institutionId)
      return res.status(400).json({ error: "institutionId is required." });

    const Institution = require("../Models/Institution");
    const institution = await Institution.findById(institutionId);
    // Note: event badges awarding is deferred; remove unused function to satisfy linting.

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.institutionId = institution._id;
    user.institutionVerificationStatus = institution.isVerified
      ? "verified"
      : "pending";
    await user.save();

    return res.json({
      message: "Institution updated.",
      user: sanitizeUser(user),
    });
  } catch (err) {
    logger.error("SetInstitutionForMe error:", err);
    return res.status(500).json({ error: "Failed to set institution." });
  }
}

// ---------------- Resend OTP ----------------
async function resendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const tempStr = await redisClient.get(email);
    if (!tempStr)
      return res
        .status(400)
        .json({ error: "No pending registration found for this email." });

    const tempData = JSON.parse(tempStr);
    const otp = otpgenrater();
    try {
      await emailService.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}. Please enter it within 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">CampVerse Verification Code</h2>
            <p>Hello ${tempData.name},</p>
            <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
            <p>Please enter this code within 5 minutes to complete your registration.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message from CampVerse.</p>
          </div>
        `,
      });
      logger.info(`Email resent successfully to ${email}`);
    } catch (emailError) {
      logger.error("Email sending failed:", emailError.message);
      return res
        .status(500)
        .json({
          error: "Failed to send verification email. Please try again.",
        });
    }
    tempData.otp = otp;
    await redisClient.setEx(email, 600, JSON.stringify(tempData));
    return res.status(200).json({ message: "OTP resent to email." });
  } catch (err) {
    logger.error("Resend OTP error:", err);
    return res
      .status(500)
      .json({ error: "Server error during OTP resend. Please try again." });
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
  linkGoogleAccount,
  setupPasswordForGoogleUser,
  changePassword,
  sendOtpForGoogleUser,
  verifyOtpForGoogleUser,
  getAuthStatus,
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
  uploadProfilePhoto: uploadProfilePhotoHandler,
  setInstitutionForMe,
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
  deleteMe,
  unlinkGoogleAccount,
  logout,
};
