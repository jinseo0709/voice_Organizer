'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@voice-organizer/shared';
import { authService, type AuthUser } from '@voice-organizer/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInDemo: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  isFirebaseAuth: boolean;
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

// Firebase AuthUser를 앱 User 타입으로 변환
const mapAuthUserToUser = (authUser: AuthUser): User => {
  return {
    id: authUser.uid,
    email: authUser.email || '',
    displayName: authUser.displayName || undefined,
    photoURL: authUser.photoURL || undefined,
    isAnonymous: authUser.isAnonymous,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseAuth, setIsFirebaseAuth] = useState(false);

  // Firebase Auth 상태 리스너
  useEffect(() => {
    console.log('🔐 Setting up Firebase Auth state listener...');

    const unsubscribe = authService.onAuthStateChanged((authUser) => {
      console.log('🔐 Auth state changed:', authUser ? 'User logged in' : 'No user');

      if (authUser) {
        const appUser = mapAuthUserToUser(authUser);
        setUser(appUser);
        setIsFirebaseAuth(true);
        // Firebase 로그인 시 데모 사용자 정보 제거
        localStorage.removeItem('demo_user');
      } else {
        // Firebase 사용자가 없으면 데모 사용자 확인
        const savedDemoUser = localStorage.getItem('demo_user');
        if (savedDemoUser) {
          try {
            const parsedUser = JSON.parse(savedDemoUser);
            // Date 객체 복원
            parsedUser.createdAt = new Date(parsedUser.createdAt);
            parsedUser.updatedAt = new Date(parsedUser.updatedAt);
            setUser(parsedUser);
            setIsFirebaseAuth(false);
          } catch (error) {
            console.error('Failed to parse demo user:', error);
            setUser(null);
            setIsFirebaseAuth(false);
          }
        } else {
          setUser(null);
          setIsFirebaseAuth(false);
        }
      }
      setLoading(false);
    });

    return () => {
      console.log('🔐 Unsubscribing from Auth state listener');
      unsubscribe();
    };
  }, []);

  const refreshUser = useCallback(async () => {
    const currentAuthUser = authService.getCurrentUser();
    if (currentAuthUser) {
      setUser(mapAuthUserToUser(currentAuthUser));
      setIsFirebaseAuth(true);
    } else {
      // 데모 사용자 확인
      const savedDemoUser = localStorage.getItem('demo_user');
      if (savedDemoUser) {
        try {
          const parsedUser = JSON.parse(savedDemoUser);
          parsedUser.createdAt = new Date(parsedUser.createdAt);
          parsedUser.updatedAt = new Date(parsedUser.updatedAt);
          setUser(parsedUser);
          setIsFirebaseAuth(false);
        } catch (error) {
          console.error('Failed to parse demo user:', error);
          setUser(null);
        }
      }
    }
  }, []);

  // 데모 로그인 (Firebase 없이)
  const signInDemo = useCallback(async (email: string) => {
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
    setIsFirebaseAuth(false);
    localStorage.setItem('demo_user', JSON.stringify(demoUser));
  }, []);

  // Google 로그인
  const signInWithGoogle = useCallback(async () => {
    try {
      console.log('🔐 Signing in with Google...');
      const authUser = await authService.signInWithGoogle();
      setUser(mapAuthUserToUser(authUser));
      setIsFirebaseAuth(true);
      localStorage.removeItem('demo_user');
      console.log('✅ Google sign in successful');
    } catch (error) {
      console.error('❌ Google sign in failed:', error);
      throw error;
    }
  }, []);

  // 이메일/비밀번호 로그인
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      console.log('🔐 Signing in with email...');
      const authUser = await authService.signInWithEmail(email, password);
      setUser(mapAuthUserToUser(authUser));
      setIsFirebaseAuth(true);
      localStorage.removeItem('demo_user');
      console.log('✅ Email sign in successful');
    } catch (error) {
      console.error('❌ Email sign in failed:', error);
      throw error;
    }
  }, []);

  // 이메일/비밀번호 회원가입
  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      console.log('🔐 Creating account with email...');
      const authUser = await authService.createUserWithEmail(email, password, displayName);
      setUser(mapAuthUserToUser(authUser));
      setIsFirebaseAuth(true);
      localStorage.removeItem('demo_user');
      console.log('✅ Account created successfully');
    } catch (error) {
      console.error('❌ Account creation failed:', error);
      throw error;
    }
  }, []);

  // 익명 로그인
  const signInAnonymously = useCallback(async () => {
    try {
      console.log('🔐 Signing in anonymously...');
      const authUser = await authService.signInAnonymously();
      setUser(mapAuthUserToUser(authUser));
      setIsFirebaseAuth(true);
      localStorage.removeItem('demo_user');
      console.log('✅ Anonymous sign in successful');
    } catch (error) {
      console.error('❌ Anonymous sign in failed:', error);
      throw error;
    }
  }, []);

  // 로그아웃
  const signOut = useCallback(async () => {
    try {
      console.log('🔐 Signing out...');

      if (isFirebaseAuth) {
        await authService.signOut();
      }

      setUser(null);
      setIsFirebaseAuth(false);
      localStorage.removeItem('demo_user');
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
      throw error;
    }
  }, [isFirebaseAuth]);

  const contextValue: AuthContextType = {
    user,
    loading,
    signOut,
    refreshUser,
    signInDemo,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInAnonymously,
    isFirebaseAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}