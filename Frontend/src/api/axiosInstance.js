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

const API_URL = import.meta.env.VITE_API_URL || 'https://imkrish-campverse-backend.hf.space';

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

    // Handle network errors or missing responses
    if (!error.response) {
      console.error('[Auth] Network error or server unreachable:', error.message);
      return Promise.reject(error);
    }

    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh if this is already a refresh request
      if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/users/me')) {
        // If /me returns 401, we might be truly logged out or token is invalid
        // But let's check if it's specifically the refresh endpoint
        if (originalRequest.url?.includes('/auth/refresh')) {
          console.log('[Auth] Refresh token invalid, logging out...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
          return Promise.reject(error);
        }
      }

      // Don't try to refresh for login/register endpoints
      if (originalRequest.url?.includes('/login') || 
          originalRequest.url?.includes('/register') ||
          originalRequest.url?.includes('/google-signin')) {
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
        console.log('[Auth] Access token expired, attempting refresh...');
        
        // Call refresh endpoint - browser automatically sends the HttpOnly cookie
        const response = await axios.post(
          `${API_URL}/api/auth/refresh`,
          {},
          { 
            withCredentials: true // Browser sends HttpOnly cookie automatically
          }
        );

        if (response.data.success && response.data.accessToken) {
          // Fix: Ensure we extract user correctly, handling potential nested structures
          const accessToken = response.data.accessToken;
          const user = response.data.user || response.data.data?.user;
          
          console.log('[Auth] Token refresh successful!');
          
          // Update stored access token
          localStorage.setItem('token', accessToken);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
          }

          // Trigger storage event to notify other tabs
          window.dispatchEvent(new Event('storage'));

          // Update authorization header for future requests
          api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;

          // Process queued requests
          processQueue(null, accessToken);
          
          // Retry the original failed request
          return api(originalRequest);
        } else {
          throw new Error('Refresh failed - no access token in response');
        }
      } catch (refreshError) {
        console.error('[Auth] Token refresh failed:', refreshError.message);
        processQueue(refreshError, null);
        
        // Clear auth and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
    // Call server logout to clear the HttpOnly cookie
    await api.post('/api/auth/logout');
    console.log('[Auth] Logged out successfully');
  } catch (error) {
    console.error('[Auth] Logout API error:', error);
  } finally {
    // Always clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  }
};

export default api;
