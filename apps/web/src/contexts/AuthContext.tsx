'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@voice-organizer/shared';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInDemo: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    // 데모 모드에서는 로컬스토리지에서 사용자 정보 확인
    try {
      const savedUser = localStorage.getItem('demo_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to parse saved user:', error);
      setUser(null);
    }
  };

  const signInDemo = async (email: string) => {
    const demoUser: User = {
      id: 'demo-user-' + Date.now(),
      email: email,
      displayName: email.split('@')[0],
      photoURL: '',
      isAnonymous: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setUser(demoUser);
    localStorage.setItem('demo_user', JSON.stringify(demoUser));
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('demo_user');
  };

  useEffect(() => {
    // 초기 로딩 시 사용자 상태 확인
    const initializeAuth = async () => {
      setLoading(true);
      try {
        await refreshUser();
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const contextValue: AuthContextType = {
    user,
    loading,
    signOut,
    refreshUser,
    signInDemo,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}