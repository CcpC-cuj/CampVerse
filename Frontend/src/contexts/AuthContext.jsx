// src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from '../utils/auth';
import { getMe } from '../api/user';

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
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  useEffect(() => {
    const token = getToken();
    const userData = getUser();
    let expired = false;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        expired = payload.exp <= currentTime;
      } catch (error) {
        expired = true;
      }
    }
    if (token && userData && !expired) {
      setUserState(userData);
      // Auto-refresh user data on mount to ensure latest state
      refreshUserSilently();
    } else if (expired) {
      removeToken();
      removeUser();
      setUserState(null);
  // Use React Router navigation for better UX
  // import { useNavigate } from 'react-router-dom';
  // const navigate = useNavigate();
  // navigate('/');
    }
    setLoading(false);
  }, []);

  // Periodic refresh to keep user data in sync
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      refreshUserSilently();
    }, 60000); // Refresh every 60 seconds
    
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
      console.error('Silent refresh failed:', error);
    }
  };

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
    setUserState(userData);
    setLastRefresh(Date.now());
  };

  const logout = () => {
    removeToken();
    removeUser();
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
      console.error('Failed to refresh user data:', error);
    }
  };

  // Function to update specific user fields without full refresh
  const updateUserState = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    setUserState(updatedUser);
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
      lastRefresh
    }}>
      {children}
    </AuthContext.Provider>
  );
};
