/**
 * QR Code Cleanup Service
 * Handles cleanup of expired QR codes and notifications
 */

const EventParticipationLog = require('../Models/EventParticipationLog');
const { sendMail } = require('../Services/email').createEmailService();
const User = require('../Models/User');

/**
 * Clean up expired QR codes
 * - Marks expired QR codes as unusable
 * - Sends notifications to users with expired QR codes
 * @returns {Object} Cleanup statistics
 */
async function cleanupExpiredQRCodes() {
  try {
    const now = new Date();
    
    // Find all participation logs with expired QR codes that haven't been marked as unusable
    const expiredLogs = await EventParticipationLog.find({
      status: 'registered',
      'qrCode.expiresAt': { $lt: now },
      'qrCode.isUsed': false
    }).populate('eventId userId');
    
    if (expiredLogs.length === 0) {
      console.log('[QR Cleanup] No expired QR codes found');
      return {
        success: true,
        processed: 0,
        notified: 0
      };
    }
    
    console.log(`[QR Cleanup] Found ${expiredLogs.length} expired QR codes`);
    
    let notifiedCount = 0;
    const errors = [];
    
    // Process each expired QR code
    for (const log of expiredLogs) {
      try {
        // Mark QR as used (to prevent further scans)
        log.qrCode.isUsed = true;
        log.qrCode.usedAt = now;
        log.qrCode.usedBy = 'system_cleanup';
        await log.save();
        
        // Send notification email to user
        if (log.userId && log.userId.email && log.eventId) {
          try {
            await sendMail({
              to: log.userId.email,
              subject: `QR Code Expired - ${log.eventId.title}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
                    .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>QR Code Expired</h1>
                    </div>
                    <div class="content">
                      <p>Dear ${log.userId.name || 'User'},</p>
                      
                      <div class="alert-box">
                        <strong>⚠️ Your QR code for the following event has expired:</strong>
                      </div>
                      
                      <div class="info-box">
                        <h2 style="margin-top: 0; color: #667eea;">${log.eventId.title}</h2>
                        <p><strong>Date:</strong> ${new Date(log.eventId.date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}</p>
                        <p><strong>Time:</strong> ${log.eventId.time || 'TBD'}</p>
                        <p><strong>Location:</strong> ${log.eventId.location || 'TBD'}</p>
                        <p><strong>QR Expired At:</strong> ${new Date(log.qrCode.expiresAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })}</p>
                      </div>
                      
                      <p>Your QR code has expired and can no longer be used for attendance marking. This typically happens when QR codes expire 2 hours after the event ends.</p>
                      
                      <p><strong>What does this mean?</strong></p>
                      <ul>
                        <li>If you attended the event and scanned your QR code before it expired, your attendance is already recorded</li>
                        <li>If you did not scan your QR code, you will need to contact the event host to manually mark your attendance</li>
                        <li>Your registration for this event remains valid</li>
                      </ul>
                      
                      <p>If you believe your attendance was not properly recorded, please contact the event organizer directly or reach out to our support team.</p>
                      
                      <div class="footer">
                        <p>This is an automated notification from CampVerse</p>
                        <p>If you have questions, please contact support@campverse.com</p>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
              `
            });
            notifiedCount++;
          } catch (emailErr) {
            console.error(`[QR Cleanup] Failed to send expiration email to ${log.userId.email}:`, emailErr.message);
            errors.push({
              logId: log._id,
              userId: log.userId._id,
              error: 'Email notification failed'
            });
          }
        }
      } catch (err) {
        console.error(`[QR Cleanup] Error processing log ${log._id}:`, err.message);
        errors.push({
          logId: log._id,
          error: err.message
        });
      }
    }
    
    const result = {
      success: true,
      processed: expiredLogs.length,
      notified: notifiedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log('[QR Cleanup] Cleanup completed:', result);
    return result;
    
  } catch (err) {
    console.error('[QR Cleanup] Fatal error during cleanup:', err);
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Clean up QR codes for completed events
 * - Marks QR codes as expired for events that ended more than 2 hours ago
 * @returns {Object} Cleanup statistics
 */
async function cleanupCompletedEventQRCodes() {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    // Find events that ended more than 2 hours ago
    const Event = require('../Models/Event');
    const completedEvents = await Event.find({
      date: { $lt: twoHoursAgo }
    });
    
    if (completedEvents.length === 0) {
      console.log('[QR Cleanup] No completed events found');
      return {
        success: true,
        eventsProcessed: 0,
        qrCodesExpired: 0
      };
    }
    
    console.log(`[QR Cleanup] Found ${completedEvents.length} completed events`);
    
    let qrCodesExpired = 0;
    
    // Process each completed event
    for (const event of completedEvents) {
      const eventEndTime = new Date(event.date);
      const expirationTime = new Date(eventEndTime.getTime() + 2 * 60 * 60 * 1000);
      
      // Update QR codes that haven't been set to expire yet
      const result = await EventParticipationLog.updateMany(
        {
          eventId: event._id,
          status: 'registered',
          'qrCode.expiresAt': { $gt: now }, // Only update QR codes that haven't expired yet
          'qrCode.isUsed': false
        },
        {
          $set: {
            'qrCode.expiresAt': expirationTime
          }
        }
      );
      
      qrCodesExpired += result.modifiedCount;
    }
    
    const result = {
      success: true,
      eventsProcessed: completedEvents.length,
      qrCodesExpired,
      timestamp: new Date().toISOString()
    };
    
    console.log('[QR Cleanup] Completed event QR cleanup:', result);
    return result;
    
  } catch (err) {
    console.error('[QR Cleanup] Error cleaning up completed event QR codes:', err);
    return {
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run all cleanup tasks
 * @returns {Object} Combined cleanup statistics
 */
async function runCleanup() {
  console.log('[QR Cleanup] Starting scheduled cleanup...');
  
  const results = {
    startTime: new Date().toISOString(),
    expiredQRCleanup: await cleanupExpiredQRCodes(),
    completedEventCleanup: await cleanupCompletedEventQRCodes(),
    endTime: new Date().toISOString()
  };
  
  console.log('[QR Cleanup] Scheduled cleanup completed:', results);
  return results;
}

module.exports = {
  cleanupExpiredQRCodes,
  cleanupCompletedEventQRCodes,
  runCleanup
};
