
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { auth } from '../lib/firebase';
// Fix: Import onAuthStateChanged from modular firebase/auth to resolve "no exported member" error
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithApple: () => Promise<{ success: boolean; error?: string }>;
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLocalMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);

  useEffect(() => {
    // If Firebase Auth is missing, handle user session locally
    if (!auth) {
      console.info("SubHub: Auth initialized in Local Mode (Persistence enabled).");
      setIsLocalMode(true);
      const localUser = authService.getLocalUser();
      setUser(localUser);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    getRedirectResult(auth).then((result) => {
      if (cancelled) return;
      if (result?.user) {
        setUser(authService.mapFirebaseUser(result.user));
      }
    }).catch(() => {}).finally(() => {
      if (cancelled) return;
      setIsLoading(false);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(authService.mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const signup = async (name: string, email: string, password: string) => {
    const result = await authService.signup(name, email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const loginWithGoogle = async () => {
    const result = await authService.loginWithGoogle();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const loginWithApple = async () => {
    const result = await authService.loginWithApple();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const loginWithFacebook = async () => {
    const result = await authService.loginWithFacebook();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, loginWithGoogle, loginWithApple, loginWithFacebook, logout, isLocalMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
