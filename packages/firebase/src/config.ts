import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

class FirebaseService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private firestore: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  private initialized: boolean = false;

  async initialize(config: FirebaseConfig): Promise<void> {
    // 이미 초기화되었으면 중복 초기화 방지
    if (this.initialized && this.app) {
      console.log('✅ Firebase already initialized - skipping');
      return;
    }

    // 클라이언트 사이드에서만 초기화
    if (typeof globalThis !== 'undefined' && typeof (globalThis as any).window === 'undefined') {
      console.warn('⚠️ Firebase initialization skipped on server side');
      return;
    }

    try {
      console.log('🔥 Starting Firebase client initialization...');
      
      // Firebase 앱 초기화 (중복 방지)
      try {
        this.app = initializeApp(config);
        console.log('✅ Firebase App initialized successfully');
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log('✅ Firebase App already exists - using existing instance');
          // 기존 앱 가져오기
          const { getApps } = await import('firebase/app');
          const apps = getApps();
          this.app = apps.length > 0 ? apps[0] : null;
          if (!this.app) {
            throw new Error('Failed to get existing Firebase app');
          }
        } else {
          throw error;
        }
      }
      
      // 서비스들 초기화
      this.auth = getAuth(this.app);
      console.log('✅ Firebase Auth service ready');
      
      this.firestore = getFirestore(this.app);
      console.log('✅ Firestore service ready');
      
      this.storage = getStorage(this.app);
      console.log('✅ Firebase Storage service ready');
      
      this.initialized = true;
      console.log('🎉 All Firebase services initialized successfully');
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  getApp(): FirebaseApp {
    if (!this.app) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.app;
  }

  getAuth(): Auth {
    if (!this.auth) {
      throw new Error('Firebase Auth not initialized.');
    }
    return this.auth;
  }

  getFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error('Firestore not initialized.');
    }
    return this.firestore;
  }

  getStorage(): FirebaseStorage {
    if (!this.storage) {
      throw new Error('Firebase Storage not initialized.');
    }
    return this.storage;
  }
}

export const firebase = new FirebaseService();
export default firebase;