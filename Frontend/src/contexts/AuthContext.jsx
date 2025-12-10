// src/contexts/AuthContext.jsx
// Updated to work with HttpOnly cookie-based refresh tokens

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from '../utils/auth';
import { getMe } from '../api/user';
import { refreshAccessToken, logout as apiLogout } from '../api/auth';

const AuthContext = createContext();

// Token refresh buffer - refresh 5 minutes before expiry (increased for safety)
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes in ms
// Minimum time between refresh attempts to prevent spam
const MIN_REFRESH_INTERVAL = 30 * 1000; // 30 seconds
// Check token validity on user activity (like Instagram does)
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const refreshTimeoutRef = useRef(null);
  const activityIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);
  const lastRefreshAttemptRef = useRef(0);

  // NOTE: Refresh token is now stored as HttpOnly cookie by the server
  // We no longer need to manage it in localStorage
  // The browser automatically sends it with requests to the auth endpoints

  // Calculate time until token expires
  const getTokenExpiryTime = useCallback((token) => {
    if (!token) return 0;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return (payload.exp * 1000) - Date.now();
    } catch {
      return 0;
    }
  }, []);

  // Check if token is expired or about to expire
  const isTokenExpired = useCallback((token) => {
    const timeUntilExpiry = getTokenExpiryTime(token);
    return timeUntilExpiry <= 0;
  }, [getTokenExpiryTime]);

  // Check if token needs refresh soon (within buffer time)
  const needsRefreshSoon = useCallback((token) => {
    const timeUntilExpiry = getTokenExpiryTime(token);
    return timeUntilExpiry > 0 && timeUntilExpiry <= TOKEN_REFRESH_BUFFER;
  }, [getTokenExpiryTime]);

  // Refresh the access token with throttling
  // The refresh token is automatically sent as HttpOnly cookie by the browser
  const refreshToken = useCallback(async (force = false) => {
    // Prevent concurrent refresh attempts
    if (isRefreshingRef.current) return null;

    // Throttle refresh attempts (unless forced)
    const now = Date.now();
    if (!force && now - lastRefreshAttemptRef.current < MIN_REFRESH_INTERVAL) {
      return getToken(); // Return current token if within throttle period
    }

    isRefreshingRef.current = true;
    lastRefreshAttemptRef.current = now;

    try {
      // Call refresh - browser automatically sends HttpOnly cookie
      const result = await refreshAccessToken();

      if (result.success && result.accessToken) {
        setToken(result.accessToken);
        if (result.user) {
          setUser(result.user);
          setUserState(result.user);
        }
        // Note: New refresh token (if any) is automatically set as cookie by server
        // We don't need to handle it in localStorage anymore
        setLastRefresh(Date.now());
        return result.accessToken;
      }
      // If refresh returned success:false, the cookie is invalid
      if (result.error) {
        console.warn('Refresh token invalid:', result.error);
      }
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Token refresh failed - user needs to login again
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // Logout function (internal use)
  const doLogout = useCallback(async () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    if (activityIntervalRef.current) {
      clearInterval(activityIntervalRef.current);
    }

    // Call server to clear the HttpOnly cookie
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Clear local storage regardless
    removeToken();
    removeUser();
    setUserState(null);
    window.location.href = '/';
  }, []);

  // Schedule next token refresh
  const scheduleTokenRefresh = useCallback((token) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const timeUntilExpiry = getTokenExpiryTime(token);
    // Refresh earlier to ensure we don't cut it too close
    const refreshTime = Math.max(timeUntilExpiry - TOKEN_REFRESH_BUFFER, 1000);

    if (refreshTime > 0 && refreshTime < 24 * 60 * 60 * 1000) { // Max 24 hours
      refreshTimeoutRef.current = setTimeout(async () => {
        const newToken = await refreshToken(true); // Force refresh on scheduled refresh
        if (newToken) {
          scheduleTokenRefresh(newToken);
        }
      }, refreshTime);
    }
  }, [getTokenExpiryTime, refreshToken]);

  // Activity-based token check (like Instagram does)
  // This ensures token is fresh when user is active
  const checkTokenOnActivity = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    if (isTokenExpired(token) || needsRefreshSoon(token)) {
      const newToken = await refreshToken();
      if (newToken) {
        scheduleTokenRefresh(newToken);
      }
    }
  }, [isTokenExpired, needsRefreshSoon, refreshToken, scheduleTokenRefresh]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      const userData = getUser();

      // Case 1: We have a valid access token and user data
      if (token && userData && !isTokenExpired(token)) {
        setUserState(userData);
        scheduleTokenRefresh(token);
        // Refresh user data silently in background
        refreshUserSilently();
        // If token needs refresh soon, do it now
        if (needsRefreshSoon(token)) {
          refreshToken();
        }
        setLoading(false);
        return;
      }

      // Case 2: Access token expired or missing
      // Try to refresh using HttpOnly cookie (browser sends it automatically)
      try {
        const newToken = await refreshToken(true);
        if (newToken) {
          // Token refreshed successfully
          // Get fresh user data if we don't have it or it might be stale
          try {
            const freshUserData = await getMe();
            if (freshUserData && !freshUserData.error) {
              setUser(freshUserData);
              setUserState(freshUserData);
            } else if (userData) {
              // Fall back to stored user data if API fails
              setUserState(userData);
            }
          } catch {
            // Fall back to stored user data
            if (userData) {
              setUserState(userData);
            }
          }
          scheduleTokenRefresh(newToken);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Silent refresh failed on init:', error);
      }

      // Case 3: No valid tokens (refresh cookie missing or invalid), 
      // clear everything and show logged out state
      removeToken();
      removeUser();
      setUserState(null);
      setLoading(false);
    };

    initAuth();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
    };
  }, []);

  // Activity-based token check - like Instagram's approach
  // Periodically check and refresh token while user is active
  useEffect(() => {
    if (!user) return;

    // Check token on activity interval
    activityIntervalRef.current = setInterval(() => {
      checkTokenOnActivity();
    }, ACTIVITY_CHECK_INTERVAL);

    // Also check token on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTokenOnActivity();
      }
    };

    // Check token on user activity events (debounced)
    let activityTimeout;
    const handleActivity = () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        checkTokenOnActivity();
      }, 5000); // Check 5 seconds after activity
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkTokenOnActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('keydown', handleActivity);

    return () => {
      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkTokenOnActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('keydown', handleActivity);
    };
  }, [user, checkTokenOnActivity]);

  // Silent refresh without UI changes
  const refreshUserSilently = async () => {
    try {
      const token = getToken();
      if (!token) return;

      // Also check token before making API call
      if (needsRefreshSoon(token)) {
        await refreshToken();
      }

      const freshUserData = await getMe();
      if (freshUserData && !freshUserData.error) {
        setUser(freshUserData);
        setUserState(freshUserData);
        setLastRefresh(Date.now());
      }
    } catch (error) {
      // If unauthorized, try to refresh token
      if (error.response?.status === 401) {
        await refreshToken();
      }
    }
  };

  // Login function - called after successful authentication
  // Refresh token is now set as HttpOnly cookie by server, not passed here
  const login = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
    setUserState(userData);
    setLastRefresh(Date.now());
    lastRefreshAttemptRef.current = Date.now();

    // Note: Refresh token is automatically set as HttpOnly cookie by server
    // We no longer need to store it in localStorage

    // Schedule token refresh
    scheduleTokenRefresh(accessToken);
  };

  // Public logout function
  const logout = async () => {
    await doLogout();
  };

  // Function to refresh user data from backend
  const refreshUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        return;
      }

      const freshUserData = await getMe();
      if (freshUserData && !freshUserData.error) {
        setUser(freshUserData);
        setUserState(freshUserData);
        setLastRefresh(Date.now());
      }
    } catch (error) {
      // Failed to refresh user data - silently ignore
    }
  };

  // Function to update specific user fields without full refresh
  const updateUserState = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    setUserState(updatedUser);
  };

  // Force token refresh (useful for manual refresh button)
  const forceRefreshToken = async () => {
    return refreshToken(true);
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser: updateUserState,
      login,
      logout,
      loading,
      isAuthenticated: !!user,
      refreshUser,
      refreshToken: forceRefreshToken,
      lastRefresh
    }}>
      {children}
    </AuthContext.Provider>
  );
};
