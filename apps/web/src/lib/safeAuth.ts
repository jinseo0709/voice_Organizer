import { firebase, authService } from '@voice-organizer/firebase';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBqE_XHdmQ8DqPwxKJyQxzV7Ns9BcEfGhI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "voice-organizer-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "voice-organizer-app",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "voice-organizer-app.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "987654321098",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:987654321098:web:a1b2c3d4e5f6g7h8i9"
};

// 전역 Firebase 초기화 상태
let isFirebaseInitialized = false;

// Firebase 안전 초기화 함수
export const initializeFirebaseSafely = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isFirebaseInitialized) {
      resolve(true);
      return;
    }

    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    try {
      console.log('🔥 Firebase 초기화 시작...');
      firebase.initialize(firebaseConfig);
      isFirebaseInitialized = true;
      console.log('✅ Firebase 초기화 완료');
      resolve(true);
    } catch (error) {
      console.error('❌ Firebase 초기화 오류:', error);
      // Firebase가 이미 초기화된 경우
      if (error instanceof Error && error.message.includes('already initialized')) {
        console.log('✅ Firebase 이미 초기화됨');
        isFirebaseInitialized = true;
        resolve(true);
      } else {
        resolve(false);
      }
    }
  });
};

// AuthService 래퍼 - 안전한 호출을 위해
export const SafeAuthService = {
  async onAuthStateChanged(callback: (user: any) => void) {
    const initialized = await initializeFirebaseSafely();
    if (!initialized) {
      console.error('Firebase 초기화 실패 - 인증 상태 변화 감지 불가');
      callback(null);
      return () => {}; // 빈 unsubscribe 함수
    }
    
    try {
      return authService.onAuthStateChanged(callback);
    } catch (error) {
      console.error('AuthService.onAuthStateChanged 오류:', error);
      callback(null);
      return () => {};
    }
  },

  async signInWithGoogle() {
    const initialized = await initializeFirebaseSafely();
    if (!initialized) {
      return {
        user: null,
        success: false,
        error: 'Firebase 초기화 실패'
      };
    }

    try {
      const user = await authService.signInWithGoogle();
      return {
        user,
        success: true
      };
    } catch (error) {
      console.error('Google 로그인 실패:', error);
      return {
        user: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async signInWithEmail(email: string, password: string) {
    const initialized = await initializeFirebaseSafely();
    if (!initialized) {
      return {
        user: null,
        success: false,
        error: 'Firebase 초기화 실패'
      };
    }

    try {
      const user = await authService.signInWithEmail(email, password);
      return {
        user,
        success: true
      };
    } catch (error) {
      console.error('이메일 로그인 실패:', error);
      return {
        user: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async signUpWithEmail(email: string, password: string) {
    const initialized = await initializeFirebaseSafely();
    if (!initialized) {
      return {
        user: null,
        success: false,
        error: 'Firebase 초기화 실패'
      };
    }

    try {
      const user = await authService.createUserWithEmail(email, password);
      return {
        user,
        success: true
      };
    } catch (error) {
      console.error('이메일 회원가입 실패:', error);
      return {
        user: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async signOut() {
    const initialized = await initializeFirebaseSafely();
    if (!initialized) {
      return {
        success: false,
        error: 'Firebase 초기화 실패'
      };
    }

    try {
      await authService.signOut();
      return { success: true };
    } catch (error) {
      console.error('로그아웃 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  async getCurrentUser() {
    const initialized = await initializeFirebaseSafely();
    if (!initialized) {
      return null;
    }

    try {
      return authService.getCurrentUser();
    } catch (error) {
      console.error('현재 사용자 가져오기 실패:', error);
      return null;
    }
  }
};

export { firebase, authService };
export default SafeAuthService;