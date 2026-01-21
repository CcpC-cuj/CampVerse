import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from '../utils/auth';
import { getMe, updateLocalUserIfPresent } from '../api/user';
import api from '../api/axiosInstance';
import { resetSocket } from '../utils/socketManager';

const AuthContext = createContext();

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

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      const userData = getUser();

      if (token && userData) {
        setUserState(userData);
        // Silently refresh user data to ensure it's still valid
        try {
          const freshUserData = await getMe();
          if (freshUserData && !freshUserData.error) {
            setUserState(freshUserData);
          }
        } catch (error) {
          console.warn('Initial background user refresh failed:', error);
          if (error.response?.status === 401) {
            // Token is truly dead and refresh failed
            logout();
          }
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen for storage events (for cross-tab sync)
    const handleStorageChange = (e) => {
      // If user or token changes in another tab, update this tab
      if (e.key === 'user') {
        const newUser = e.newValue ? JSON.parse(e.newValue) : null;
        setUserState(newUser);
      } else if (e.key === 'token' && !e.newValue) {
        // If logged out in another tab
        setUserState(null);
      } else if (!e.key) {
        // Custom 'storage' event triggered by axiosInstance after successful refresh
        const freshUser = getUser();
        if (freshUser) setUserState(freshUser);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Login function - called after successful OTP verification or social sign-in
  const login = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
    setUserState(userData);
    // Notify other tabs
    window.dispatchEvent(new Event('storage'));
  };

  // Logout function
  const logout = async () => {
    try {
      // Call server to clear the HttpOnly refresh cookie
      await api.post('/api/auth/logout').catch(() => {});
    } finally {
      // Clear local state
      removeToken();
      removeUser();
      setUserState(null);
      resetSocket();
      // Notify other tabs by triggering explicit storage changes
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage'));
      window.location.href = '/';
    }
  };

  // Function to refresh user data from backend
  const refreshUser = async () => {
    try {
      const freshUserData = await getMe();
      if (freshUserData && !freshUserData.error) {
        setUser(freshUserData);
        setUserState(freshUserData);
        updateLocalUserIfPresent({ user: freshUserData });
      }
    } catch (error) {
      console.error('Manual user refresh failed:', error);
    }
  };

  const refreshUserSilently = async () => {
    try {
      const freshUserData = await getMe();
      if (freshUserData && !freshUserData.error) {
        let didUpdate = false;
        setUserState((prev) => {
          if (!prev) {
            didUpdate = true;
            return freshUserData;
          }
          const prevJson = JSON.stringify(prev);
          const nextJson = JSON.stringify(freshUserData);
          if (prevJson === nextJson) {
            return prev;
          }
          didUpdate = true;
          return freshUserData;
        });

        if (didUpdate) {
          setUser(freshUserData);
          updateLocalUserIfPresent({ user: freshUserData });
        }
      }
    } catch (error) {
      console.warn('Silent user refresh failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      setUser: (updates) => setUserState(prev => ({ ...prev, ...updates })),
      login,
      logout,
      loading,
      isAuthenticated: !!user,
      refreshUser,
      refreshUserSilently,
      refreshToken: async () => {
        // Handled automatically by axiosInstance interceptors, 
        // but can be called manually if needed
        return api.post('/api/auth/refresh');
      }
    }}>
      {children}
    </AuthContext.Provider>
  );
};
