import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type Unsubscribe,
} from 'firebase/auth';
import firebase from './config';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export class AuthService {
  private googleProvider: GoogleAuthProvider;

  constructor() {
    this.googleProvider = new GoogleAuthProvider();
    this.googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  }

  // 이메일/비밀번호 로그인
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    try {
      const result = await signInWithEmailAndPassword(firebase.getAuth(), email, password);
      return this.mapUserToAuthUser(result.user);
    } catch (error) {
      console.error('Email sign in failed:', error);
      throw error;
    }
  }

  // 이메일/비밀번호 회원가입
  async createUserWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser> {
    try {
      const result = await createUserWithEmailAndPassword(firebase.getAuth(), email, password);
      
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }
      
      return this.mapUserToAuthUser(result.user);
    } catch (error) {
      console.error('User creation failed:', error);
      throw error;
    }
  }

  // Google 로그인
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const result = await signInWithPopup(firebase.getAuth(), this.googleProvider);
      return this.mapUserToAuthUser(result.user);
    } catch (error) {
      console.error('Google sign in failed:', error);
      throw error;
    }
  }

  // 익명 로그인
  async signInAnonymously(): Promise<AuthUser> {
    try {
      const result = await signInAnonymously(firebase.getAuth());
      return this.mapUserToAuthUser(result.user);
    } catch (error) {
      console.error('Anonymous sign in failed:', error);
      throw error;
    }
  }

  // 로그아웃
  async signOut(): Promise<void> {
    try {
      await signOut(firebase.getAuth());
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  }

  // 인증 상태 변화 감지
  onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe {
    return onAuthStateChanged(firebase.getAuth(), (user) => {
      callback(user ? this.mapUserToAuthUser(user) : null);
    });
  }

  // 현재 사용자 가져오기
  getCurrentUser(): AuthUser | null {
    const user = firebase.getAuth().currentUser;
    return user ? this.mapUserToAuthUser(user) : null;
  }

  // 프로필 업데이트
  async updateUserProfile(updates: { displayName?: string; photoURL?: string }): Promise<void> {
    const user = firebase.getAuth().currentUser;
    if (!user) {
      throw new Error('No authenticated user found');
    }

    try {
      await updateProfile(user, updates);
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }

  private mapUserToAuthUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
    };
  }
}

export const authService = new AuthService();
export default authService;