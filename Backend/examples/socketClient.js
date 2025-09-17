/**
 * Frontend WebSocket Client Example
 * Use this instead of fetch() to bypass CORS issues
 */

class CampVerseSocketClient {
  constructor(serverUrl = 'https://campverse-26hm.onrender.com') {
    this.serverUrl = serverUrl;
    this.socket = null;
    this.connected = false;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * Connect to the WebSocket server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      // Load Socket.IO client library
      if (typeof io === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
        script.onload = () => this.initializeSocket(resolve, reject);
        document.head.appendChild(script);
      } else {
        this.initializeSocket(resolve, reject);
      }
    });
  }

  initializeSocket(resolve, reject) {
    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to CampVerse WebSocket server');
        this.connected = true;
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket server');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        reject(error);
      });

      // Handle API responses
      this.socket.on('api:response', (response) => {
        const { requestId } = response;
        const pendingRequest = this.pendingRequests.get(requestId);
        if (pendingRequest) {
          this.pendingRequests.delete(requestId);
          if (response.status >= 400) {
            pendingRequest.reject(new Error(response.error || 'API Error'));
          } else {
            pendingRequest.resolve(response.data);
          }
        }
      });

      // Handle specific API responses
      this.socket.on('api:users:google-signin:response', (response) => {
        const pendingRequest = this.pendingRequests.get('google-signin');
        if (pendingRequest) {
          this.pendingRequests.delete('google-signin');
          if (response.status >= 400) {
            pendingRequest.reject(new Error(response.data?.error || 'Authentication failed'));
          } else {
            pendingRequest.resolve(response.data);
          }
        }
      });

    } catch (error) {
      reject(error);
    }
  }

  /**
   * Authenticate with JWT token
   */
  authenticate(token) {
    if (!this.connected) throw new Error('Not connected to WebSocket server');
    this.socket.emit('authenticate', token);
  }

  /**
   * Google Sign-in via WebSocket (bypasses CORS)
   */
  googleSignIn(googleToken) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      this.pendingRequests.set('google-signin', { resolve, reject });
      this.socket.emit('api:users:google-signin', { token: googleToken });
    });
  }

  /**
   * Generic API request via WebSocket
   */
  apiRequest(method, endpoint, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      const requestId = ++this.requestId;
      this.pendingRequests.set(requestId, { resolve, reject });

      this.socket.emit('api:request', {
        requestId,
        method,
        endpoint,
        body,
        headers
      });
    });
  }

  /**
   * Join notifications for a user
   */
  joinNotifications(userId) {
    if (!this.connected) throw new Error('Not connected to WebSocket server');
    this.socket.emit('join:notifications', userId);
  }

  /**
   * Listen for real-time notifications
   */
  onNotification(callback) {
    if (!this.connected) throw new Error('Not connected to WebSocket server');
    this.socket.on('notification', callback);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }
}

// Usage Example:
/*
const client = new CampVerseSocketClient();

// Connect to WebSocket server
await client.connect();

// Use Google Sign-in via WebSocket instead of fetch
try {
  const result = await client.googleSignIn(googleToken);
  console.log('Google sign-in successful:', result);
} catch (error) {
  console.error('Google sign-in failed:', error);
}

// Make other API requests via WebSocket
try {
  const users = await client.apiRequest('GET', '/api/users');
  console.log('Users:', users);
} catch (error) {
  console.error('API request failed:', error);
}

// Listen for real-time notifications
client.joinNotifications(userId);
client.onNotification((notification) => {
  console.log('New notification:', notification);
});
*/

export default CampVerseSocketClient;
