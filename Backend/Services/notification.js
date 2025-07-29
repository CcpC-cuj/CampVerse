const { emailsender } = require('./email');
const Notification = require('../Models/Notification');
const User = require('../Models/User');

/**
 * Create an in-app notification
 */
async function createNotification(userId, type, message, data = {}) {
  try {
    const notification = new Notification({
      targetUserId: userId,
      type,
      message,
      data,
      isRead: false,
      createdAt: new Date()
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Send host request notification to platform admin
 */
async function notifyHostRequest(userId, userName, userEmail) {
  try {
    // Find platform admin users
    const User = require('../Models/User');
    const platformAdmins = await User.find({ roles: 'platformAdmin' });
    
    // Create in-app notifications for all platform admins
    for (const admin of platformAdmins) {
      await createNotification(
        admin._id,
        'host_request',
        `New host request from ${userName} (${userEmail})`,
        { userId, userName, userEmail }
      );
    }
    
    // Send email notification to platform admins
    for (const admin of platformAdmins) {
      await sendHostRequestEmail(admin.email, admin.name, userName, userEmail);
    }
  } catch (error) {
    console.error('Error notifying host request:', error);
  }
}

/**
 * Send host approval/rejection notification to user
 */
async function notifyHostStatusUpdate(userId, userName, userEmail, status, remarks = '') {
  try {
    // Create in-app notification
    await createNotification(
      userId,
      'host_status_update',
      `Your host request has been ${status}`,
      { status, remarks }
    );
    
    // Send email notification
    await sendHostStatusEmail(userEmail, userName, status, remarks);
  } catch (error) {
    console.error('Error notifying host status update:', error);
  }
}

/**
 * Send email for host request notification
 */
async function sendHostRequestEmail(adminEmail, adminName, userName, userEmail) {
  try {
    const transporter = require('nodemailer').createTransporter({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: '"CampVerse Admin" <noreply@campverse.com>',
      to: adminEmail,
      subject: "New Host Request - Action Required",
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
      `
    });
  } catch (error) {
    console.error('Error sending host request email:', error);
  }
}

/**
 * Send email for host status update
 */
async function sendHostStatusEmail(userEmail, userName, status, remarks) {
  try {
    const transporter = require('nodemailer').createTransporter({
      service: "gmail",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const statusText = status === 'approved' ? 'approved' : 'rejected';
    const subject = `Host Request ${status === 'approved' ? 'Approved' : 'Rejected'}`;

    const info = await transporter.sendMail({
      from: '"CampVerse" <noreply@campverse.com>',
      to: userEmail,
      subject: subject,
      html: `
        <h2>Host Request ${status === 'approved' ? 'Approved' : 'Rejected'}</h2>
        <p>Hello ${userName},</p>
        <p>Your request to become a host has been <strong>${statusText}</strong>.</p>
        ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
        ${status === 'approved' ? 
          '<p>You can now create and manage events on CampVerse!</p>' : 
          '<p>You can submit a new request in the future if your circumstances change.</p>'
        }
        <p>Best regards,<br>CampVerse Team</p>
      `
    });
  } catch (error) {
    console.error('Error sending host status email:', error);
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
    console.error('Error fetching user notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, targetUserId: userId },
      { isRead: true },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
async function markAllNotificationsAsRead(userId) {
  try {
    await Notification.updateMany(
      { targetUserId: userId, isRead: false },
      { isRead: true }
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Generic unified notification function
 */
async function notifyUser({ userId, type, message, data = {}, emailOptions = null }) {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    // Check notification preferences
    const prefs = user.notificationPreferences || {};
    const emailPref = prefs.email && prefs.email[type] !== undefined ? prefs.email[type] : true;
    const inAppPref = prefs.inApp && prefs.inApp[type] !== undefined ? prefs.inApp[type] : true;
    // In-app notification
    if (inAppPref) {
      await createNotification(userId, type, message, data);
    }
    // Email notification
    if (emailPref && emailOptions) {
      await emailsender(emailOptions);
    }
  } catch (error) {
    console.error('Error in notifyUser:', error);
  }
}

/**
 * Notify multiple users (e.g., all verifiers)
 */
async function notifyUsers({ userIds, type, message, data = {}, emailOptionsFn = null }) {
  for (const userId of userIds) {
    const emailOptions = emailOptionsFn ? await emailOptionsFn(userId) : null;
    await notifyUser({ userId, type, message, data, emailOptions });
  }
}

module.exports = {
  createNotification,
  notifyHostRequest,
  notifyHostStatusUpdate,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyUser,
  notifyUsers
}; 