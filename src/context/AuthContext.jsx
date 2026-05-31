import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  // Load current user profile on startup
  const checkAuth = async () => {
    try {
      setLoading(true);
      const isDemoMode = await api.isDemoMode();
      setIsDemo(isDemoMode);
      
      const currentUser = await api.auth.me();
      setUser(currentUser);
    } catch (err) {
      console.error('Session loading failed:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      setUser(data.user);
      // Re-verify demo state
      const isDemoMode = await api.isDemoMode();
      setIsDemo(isDemoMode);
      return data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, username, password) => {
    setLoading(true);
    try {
      const res = await api.auth.register(email, username, password);
      return res;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Allow toggling Force Demo Mode for previewing
  const toggleForceDemo = (force) => {
    api.setForceDemo(force);
    checkAuth();
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo, login, register, logout, checkAuth, toggleForceDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
