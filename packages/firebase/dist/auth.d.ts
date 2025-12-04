import { type Unsubscribe } from 'firebase/auth';
export interface AuthUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isAnonymous: boolean;
}
export declare class AuthService {
    private googleProvider;
    constructor();
    signInWithEmail(email: string, password: string): Promise<AuthUser>;
    createUserWithEmail(email: string, password: string, displayName?: string): Promise<AuthUser>;
    signInWithGoogle(): Promise<AuthUser>;
    signInAnonymously(): Promise<AuthUser>;
    signOut(): Promise<void>;
    onAuthStateChanged(callback: (user: AuthUser | null) => void): Unsubscribe;
    getCurrentUser(): AuthUser | null;
    updateUserProfile(updates: {
        displayName?: string;
        photoURL?: string;
    }): Promise<void>;
    private mapUserToAuthUser;
}
export declare const authService: AuthService;
export default authService;
//# sourceMappingURL=auth.d.ts.map