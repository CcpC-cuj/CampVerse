const { emailsender } = require('./email');
const Notification = require('../Models/Notification');
const User = require('../Models/User');
const { logger } = require('../Middleware/errorHandler');

// Store io instance
let io = null;

/**
 * Set Socket.IO instance for real-time notifications
 */
function setSocketIO(socketIO) {
  io = socketIO;
}

/**
 * Create an in-app notification and emit via Socket.IO
 */
async function createNotification(userId, type, message, data = {}, link = null) {
  try {
    const notification = new Notification({
      targetUserId: userId,
      type,
      message,
      data,
      link, // Add link for actionable notifications
      isRead: false,
      createdAt: new Date(),
    });
    await notification.save();
    
    // Emit real-time notification via Socket.IO
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
      logger.info(`Real-time notification sent to user:${userId}`);
    }
    
    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Send host request notification to platform admin
 */
async function notifyHostRequest(userId, userName, userEmail) {
  try {
    // Find platform admin users AND verifiers (since verifiers can approve host requests)
    const User = require('../Models/User');
    const adminsAndVerifiers = await User.find({ 
      roles: { $in: ['platformAdmin', 'verifier'] } 
    });

    // Create in-app notifications for all platform admins and verifiers
    for (const user of adminsAndVerifiers) {
      await createNotification(
        user._id,
        'host_request',
        `New host request from ${userName} (${userEmail})`,
        { userId, userName, userEmail },
      );
    }

    // Send email notification to platform admins and verifiers
    for (const user of adminsAndVerifiers) {
      if (user.notificationPreferences?.email?.host_request !== false) {
        await sendHostRequestEmail(user.email, user.name, userName, userEmail);
      }
    }

    logger.info(`Notified ${adminsAndVerifiers.length} admins/verifiers about host request from ${userName}`);
  } catch (error) {
    logger.error('Error notifying host request:', error);
  }
}

/**
 * Send host approval/rejection notification to user
 */
async function notifyHostStatusUpdate(
  userId,
  userName,
  userEmail,
  status,
  remarks = '',
) {
  try {
    // Create in-app notification
    await createNotification(
      userId,
      'host_status_update',
      `Your host request has been ${status}`,
      { status, remarks },
    );

    // Send email notification
    await sendHostStatusEmail(userEmail, userName, status, remarks);
  } catch (error) {
    logger.error('Error notifying host status update:', error);
  }
}

// NEW: Notify platform admins AND verifiers about institution verification request
async function notifyInstitutionRequest({
  requesterId,
  requesterName,
  requesterEmail,
  institutionName,
  type,
}) {
  try {
    // Notify both platform admins AND verifiers
    const adminAndVerifiers = await User.find({ 
      roles: { $in: ['platformAdmin', 'verifier'] } 
    });
    
    for (const user of adminAndVerifiers) {
      await createNotification(
        user._id,
        'institution_request',
        `New institution verification request: ${institutionName} (${type}) by ${requesterName}`,
        { requesterId, requesterName, requesterEmail, institutionName, type },
      );
    }
    
  // Notified ${adminAndVerifiers.length} admins/verifiers about institution request for ${institutionName} (console.log removed)
  } catch (error) {
    logger.error('Error notifying institution request:', error);
  }
}

/**
 * Send email for host request notification
 */
async function sendHostRequestEmail(
  adminEmail,
  adminName,
  userName,
  userEmail,
) {
  try {
    const transporter = require('nodemailer').createTransporter({
      service: 'gmail',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: '"CampVerse Admin" <noreply@campverse.com>',
      to: adminEmail,
      subject: 'New Host Request - Action Required',
      html: `
        <h2>New Host Request</h2>
        <p>Hello ${adminName},</p>
        <p>A new host request has been submitted:</p>
        <ul>
          <li><strong>User:</strong> ${userName}</li>
          <li><strong>Email:</strong> ${userEmail}</li>
          <li><strong>Requested At:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>Please review and approve/reject this request in the admin panel.</p>
        <p>Best regards,<br>CampVerse Team</p>
      `,
    });
  } catch (error) {
    logger.error('Error sending host request email:', error);
  }
}

/**
 * Send email for host status update
 */
async function sendHostStatusEmail(userEmail, userName, status, remarks) {
  try {
    const transporter = require('nodemailer').createTransporter({
      service: 'gmail',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const statusText = status === 'approved' ? 'approved' : 'rejected';
    const subject = `Host Request ${status === 'approved' ? 'Approved' : 'Rejected'}`;

    await transporter.sendMail({
      from: '"CampVerse" <noreply@campverse.com>',
      to: userEmail,
      subject,
      html: `
        <h2>Host Request ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
        <p>Hello ${userName},</p>
        <p>Your request to become a host has been <strong>${statusText}</strong>.</p>
        ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
        ${
  status === 'approved'
    ? '<p>You can now create and manage events on CampVerse!</p>'
    : '<p>You can submit a new request in the future if your circumstances change.</p>'
}
        <p>Best regards,<br>CampVerse Team</p>
      `,
    });
  } catch (error) {
    logger.error('Error sending host status email:', error);
  }
}

/**
 * Get user's notifications
 */
async function getUserNotifications(userId, limit = 20) {
  try {
    const notifications = await Notification.find({ targetUserId: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    return notifications;
  } catch (error) {
    logger.error('Error fetching user notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId) {
  try {
    const notification = await Notification.findById(notificationId);
    if (!notification) return false;
    notification.isRead = true;
    await notification.save();
    return true;
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsAsRead(userId) {
  try {
    await Notification.updateMany(
      { targetUserId: userId, isRead: false },
      { isRead: true },
    );
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Generic unified notification function
 */
async function notifyUser({
  userId,
  type,
  message,
  data = {},
  link = null, // Add link parameter
  emailOptions = null,
}) {
  try {
    const user = await User.findById(userId).select('notificationPreferences');
    if (!user) {
      logger.warn(`User not found: ${userId}`);
      return;
    }
    // Check notification preferences
    const prefs = user.notificationPreferences || {};
    const emailPref =
      prefs.email && prefs.email[type] !== undefined ? prefs.email[type] : false; // Default to FALSE for email
    const inAppPref =
      prefs.inApp && prefs.inApp[type] !== undefined ? prefs.inApp[type] : true; // Default to TRUE for in-app
    // In-app notification
    if (inAppPref) {
      await createNotification(userId, type, message, data, link);
    }
    // Email notification
    if (emailPref && emailOptions) {
      await emailsender(emailOptions);
    }
  } catch (error) {
    logger.error('Error in notifyUser:', error);
  }
}

/**
 * Notify multiple users (e.g., all verifiers)
 */
async function notifyUsers({
  userIds,
  type,
  message,
  data = {},
  emailOptionsFn = null,
}) {
  const notificationPromises = userIds.map(async (userId) => {
    const emailOptions = emailOptionsFn ? await emailOptionsFn(userId) : null;
    return notifyUser({ userId, type, message, data, emailOptions });
  });
  await Promise.allSettled(notificationPromises);
}

// NEW: Notify users about institution verification status updates
async function notifyInstitutionStatusUpdate({
  institutionId,
  institutionName,
  status,
  remarks = '',
  verifierName = 'Administrator',
}) {
  try {
    // Find all users with this institution
    const User = require('../Models/User');
    const affectedUsers = await User.find({ institutionId }).select('_id name email');
    
    const statusText = status === 'approved' ? 'approved' : 'rejected';
    const message = `Your institution ${institutionName} has been ${statusText}`;
    
    // Send notifications to all affected users
    for (const user of affectedUsers) {
      // In-app notification
      await createNotification(
        user._id,
        'institution_status_update',
        message,
        { institutionName, status, remarks, verifierName }
      );
      
      // Email notification
      await sendInstitutionStatusEmail(user.email, user.name, institutionName, status, remarks);
    }
    
  // Notified ${affectedUsers.length} users about institution ${statusText}: ${institutionName} (console.log removed)
  } catch (error) {
    logger.error('Error notifying institution status update:', error);
  }
}

/**
 * Send email for institution status update
 */
async function sendInstitutionStatusEmail(userEmail, userName, institutionName, status, remarks) {
  try {
    const transporter = require('nodemailer').createTransporter({
      service: 'gmail',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const statusText = status === 'approved' ? 'approved' : 'rejected';
    const subject = `Institution ${status === 'approved' ? 'Approved' : 'Rejected'} - ${institutionName}`;

    await transporter.sendMail({
      from: '"CampVerse" <noreply@campverse.com>',
      to: userEmail,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${status === 'approved' ? '#28a745' : '#dc3545'};">Institution ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
          <p>Hello ${userName},</p>
          <p>Your institution <strong>${institutionName}</strong> has been <strong>${statusText}</strong>.</p>
          ${remarks ? `<div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 15px 0;">
            <strong>Verifier Notes:</strong><br>
            ${remarks}
          </div>` : ''}
          ${
  status === 'approved'
    ? `<div style="background: #d4edda; padding: 15px; border-radius: 5px; color: #155724;">
                   🎉 <strong>Great news!</strong> You can now:
                   <ul>
                     <li>Host events on CampVerse</li>
                     <li>Access all platform features</li>
                     <li>Generate certificates for participants</li>
                     <li>View institution analytics</li>
                   </ul>
                 </div>`
    : `<div style="background: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24;">
                   😔 <strong>Unfortunately, we could not verify this institution at this time.</strong>
                   <br><br>
                   <strong>What you can do:</strong>
                   <ul>
                     <li>Contact our support team if you believe this is an error</li>
                     <li>Request a different institution if you have access to another academic email</li>
                     <li>Wait for your institution to be added officially by administrators</li>
                     <li>Continue using the platform with limited features</li>
                   </ul>
                   <p>You can still discover and join events, but hosting will require institution verification.</p>
                 </div>`
}
          <hr style="margin: 25px 0; border: none; height: 1px; background: #dee2e6;">
          <p style="color: #6c757d; font-size: 14px;">
            If you have questions, please contact us at support@campverse.com<br>
            Best regards,<br>CampVerse Team
          </p>
        </div>
      `,
    });
  } catch (error) {
    logger.error('Error sending institution status email:', error);
  }
}

module.exports = {
  setSocketIO,
  createNotification,
  notifyHostRequest,
  notifyHostStatusUpdate,
  // new
  notifyInstitutionRequest,
  notifyInstitutionStatusUpdate,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyUser,
  notifyUsers,
};
