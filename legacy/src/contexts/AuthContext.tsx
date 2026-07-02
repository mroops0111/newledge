'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthState } from '@/types/User';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Prefer cookie-based session via our API route
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setAuthState({
              user: data.user,
              accessToken: null,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
        }
        setAuthState({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthState({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const login = async () => {
    // No-op in cookie mode; flow handled by API route callback
    await Promise.resolve();
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setAuthState(prev => ({ ...prev, user: data.user, isAuthenticated: true }));
          return;
        }
      }
      setAuthState(prev => ({ ...prev, user: null, isAuthenticated: false }));
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
