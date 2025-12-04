import { authService } from '@voice-organizer/firebase';

// Firebase Authentication 헬퍼 함수들
export class AuthService {
  static async signInWithGoogle() {
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
  }

  static async signInWithEmail(email: string, password: string) {
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
  }

  static async signUpWithEmail(email: string, password: string) {
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
  }

  static async signOut() {
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
  }

  static getCurrentUser() {
    return authService.getCurrentUser();
  }

  static onAuthStateChanged(callback: (user: any) => void) {
    return authService.onAuthStateChanged(callback);
  }
}