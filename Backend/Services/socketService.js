/**
 * Socket.IO Service for bypassing CORS issues
 * This service provides a WebSocket-based API that doesn't have CORS restrictions
 */

const { logger } = require('../Middleware/errorHandler');

class SocketService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send real-time notification to a specific user
   */
  sendNotificationToUser(userId, notification) {
    try {
      this.io.to(`user:${userId}`).emit('notification', notification);
      logger.info(`Notification sent to user ${userId}`);
    } catch (error) {
      logger.error('Error sending notification:', error);
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(event, data) {
    try {
      this.io.emit(event, data);
      logger.info(`Broadcasted event: ${event}`);
    } catch (error) {
      logger.error('Error broadcasting:', error);
    }
  }

  /**
   * Send message to specific room
   */
  sendToRoom(room, event, data) {
    try {
      this.io.to(room).emit(event, data);
      logger.info(`Sent ${event} to room ${room}`);
    } catch (error) {
      logger.error('Error sending to room:', error);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.io.engine.clientsCount;
  }
}

module.exports = SocketService;
