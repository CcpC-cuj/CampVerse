/**
 * Centralized Axios Instance with automatic token refresh
 * Uses HttpOnly cookies for refresh token (more secure than localStorage)
 * 
 * Flow:
 * 1. Access token stored in localStorage (short-lived, 15 min)
 * 2. Refresh token stored in HttpOnly cookie (server-set, 7 days)
 * 3. On 401 error, automatically call /api/auth/refresh
 * 4. Browser sends cookie automatically, no manual handling needed
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Create axios instance with credentials enabled for cookies
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // CRITICAL: This allows cookies to be sent/received cross-origin
});

// Track if we're currently refreshing
let isRefreshing = false;
// Queue of failed requests to retry after token refresh
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 errors and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if this is already a refresh request
      if (originalRequest.url?.includes('/auth/refresh')) {
        // Refresh token is invalid or expired, logout user
        console.log('Refresh token invalid, logging out...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Note: Cookie will be cleared by server on next request or stays expired
        window.location.href = '/';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint - browser automatically sends the HttpOnly cookie
        // No need to manually include the refresh token!
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {}, // Empty body - refresh token comes from cookie
          {
            withCredentials: true, // CRITICAL: Include cookies in this request
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (response.data.success && response.data.accessToken) {
          const { accessToken, user } = response.data;

          // Update stored access token
          localStorage.setItem('token', accessToken);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }
          // Note: New refresh token (if any) is automatically set as cookie by server

          // Update authorization header
          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          processQueue(null, accessToken);
          return api(originalRequest);
        } else {
          throw new Error('Refresh failed - no access token in response');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);

        // Clear auth and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Note: Cookie will be cleared by server or stays expired
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper to manually trigger logout
 * Call this when user clicks logout button
 */
export const logout = async () => {
  try {
    // Call server logout to clear the cookie
    await api.post('/api/auth/logout');
  } catch (error) {
    console.error('Logout API error:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
};

export default api;
