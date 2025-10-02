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

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
    setUserState(userData);
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
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      setUser: setUserState, 
      login, 
      logout, 
      loading, 
      isAuthenticated: !!user,
      refreshUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
