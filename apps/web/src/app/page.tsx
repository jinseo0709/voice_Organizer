'use client';

import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import VoiceOrganizerApp from '@/components/VoiceOrganizerApp';
// Firebase 초기화
import { firebase } from '@voice-organizer/firebase';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBqE_XHdmQ8DqPwxKJyQxzV7Ns9BcEfGhI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "voice-organizer-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "voice-organizer-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "voice-organizer-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "987654321098",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:987654321098:web:a1b2c3d4e5f6g7h8i9"
};

export default function Home() {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        console.log('🔥 Starting comprehensive Firebase initialization...');
        
        // Firebase 초기화 - 단일 진입점에서 한 번만 실행
        await firebase.initialize(firebaseConfig);
        
        // 모든 서비스 안정화를 위한 대기
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Firebase 서비스 가용성 확인
        try {
          firebase.getApp();
          firebase.getAuth();
          firebase.getFirestore();
          firebase.getStorage();
          console.log('✅ All Firebase services initialized and verified');
        } catch (serviceError) {
          console.warn('⚠️ Service verification failed:', serviceError);
          throw new Error(`Firebase services not ready: ${serviceError}`);
        }
        
        setFirebaseReady(true);
        setInitError(null);
        
      } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('already initialized')) {
          console.log('✅ Firebase already initialized');
          setFirebaseReady(true);
          setInitError(null);
        } else {
          console.error('🚨 Critical Firebase initialization error:', errorMessage);
          setInitError(errorMessage);
          // Don't proceed without proper initialization
          setFirebaseReady(false);
        }
      }
    };

    initFirebase();
  }, []);

  if (!firebaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {initError ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong className="font-bold">Firebase 초기화 오류!</strong>
              <span className="block sm:inline"> {initError}</span>
            </div>
          ) : null}
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Firebase 초기화 중...</p>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <VoiceOrganizerApp />
    </ProtectedRoute>
  );
}