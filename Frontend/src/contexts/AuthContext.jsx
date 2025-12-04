// src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from '../utils/auth';
import { getMe } from '../api/user';
import { refreshAccessToken } from '../api/auth';

const AuthContext = createContext();

// Token refresh buffer - refresh 2 minutes before expiry
const TOKEN_REFRESH_BUFFER = 2 * 60 * 1000; // 2 minutes in ms

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
  const isRefreshingRef = useRef(false);

  // Get refresh token from storage
  const getRefreshToken = () => localStorage.getItem('refreshToken');
  const setRefreshToken = (token) => localStorage.setItem('refreshToken', token);
  const removeRefreshToken = () => localStorage.removeItem('refreshToken');

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

  // Refresh the access token
  const refreshToken = useCallback(async () => {
    if (isRefreshingRef.current) return null;
    
    const storedRefreshToken = getRefreshToken();
    if (!storedRefreshToken) {
      return null;
    }

    isRefreshingRef.current = true;
    
    try {
      const result = await refreshAccessToken(storedRefreshToken);
      
      if (result.success && result.accessToken) {
        setToken(result.accessToken);
        if (result.user) {
          setUser(result.user);
          setUserState(result.user);
        }
        setLastRefresh(Date.now());
        return result.accessToken;
      }
      return null;
    } catch (error) {
      // If refresh fails, logout user
      if (error.response?.status === 401) {
        logout();
      }
      return null;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // Schedule next token refresh
  const scheduleTokenRefresh = useCallback((token) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    const timeUntilExpiry = getTokenExpiryTime(token);
    const refreshTime = Math.max(timeUntilExpiry - TOKEN_REFRESH_BUFFER, 0);

    if (refreshTime > 0) {
      refreshTimeoutRef.current = setTimeout(async () => {
        const newToken = await refreshToken();
        if (newToken) {
          scheduleTokenRefresh(newToken);
        }
      }, refreshTime);
    }
  }, [getTokenExpiryTime, refreshToken]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      const userData = getUser();
      
      if (token && userData) {
        if (isTokenExpired(token)) {
          // Token expired, try to refresh
          const newToken = await refreshToken();
          if (newToken) {
            setUserState(userData);
            scheduleTokenRefresh(newToken);
          } else {
            // Refresh failed, clear auth
            removeToken();
            removeUser();
            removeRefreshToken();
            setUserState(null);
          }
        } else {
          // Token valid, use it
          setUserState(userData);
          scheduleTokenRefresh(token);
          // Refresh user data silently
          refreshUserSilently();
        }
      }
      setLoading(false);
    };

    initAuth();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Periodic user data refresh (not token refresh)
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      refreshUserSilently();
    }, 60000); // Refresh user data every 60 seconds
    
    return () => clearInterval(interval);
  }, [user]);

  // Silent refresh without UI changes
  const refreshUserSilently = async () => {
    try {
      const token = getToken();
      if (!token) return;
      
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

  const login = (accessToken, userData, newRefreshToken = null) => {
    setToken(accessToken);
    setUser(userData);
    setUserState(userData);
    setLastRefresh(Date.now());
    
    // Store refresh token if provided
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }
    
    // Schedule token refresh
    scheduleTokenRefresh(accessToken);
  };

  const logout = () => {
    // Clear refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    removeToken();
    removeUser();
    removeRefreshToken();
    setUserState(null);
    window.location.href = '/';
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
    return refreshToken();
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
