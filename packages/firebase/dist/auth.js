"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const auth_1 = require("firebase/auth");
const config_1 = __importDefault(require("./config"));
class AuthService {
    googleProvider;
    constructor() {
        this.googleProvider = new auth_1.GoogleAuthProvider();
        this.googleProvider.setCustomParameters({
            prompt: 'select_account'
        });
    }
    // 이메일/비밀번호 로그인
    async signInWithEmail(email, password) {
        try {
            const result = await (0, auth_1.signInWithEmailAndPassword)(config_1.default.getAuth(), email, password);
            return this.mapUserToAuthUser(result.user);
        }
        catch (error) {
            console.error('Email sign in failed:', error);
            throw error;
        }
    }
    // 이메일/비밀번호 회원가입
    async createUserWithEmail(email, password, displayName) {
        try {
            const result = await (0, auth_1.createUserWithEmailAndPassword)(config_1.default.getAuth(), email, password);
            if (displayName) {
                await (0, auth_1.updateProfile)(result.user, { displayName });
            }
            return this.mapUserToAuthUser(result.user);
        }
        catch (error) {
            console.error('User creation failed:', error);
            throw error;
        }
    }
    // Google 로그인
    async signInWithGoogle() {
        try {
            const result = await (0, auth_1.signInWithPopup)(config_1.default.getAuth(), this.googleProvider);
            return this.mapUserToAuthUser(result.user);
        }
        catch (error) {
            console.error('Google sign in failed:', error);
            throw error;
        }
    }
    // 익명 로그인
    async signInAnonymously() {
        try {
            const result = await (0, auth_1.signInAnonymously)(config_1.default.getAuth());
            return this.mapUserToAuthUser(result.user);
        }
        catch (error) {
            console.error('Anonymous sign in failed:', error);
            throw error;
        }
    }
    // 로그아웃
    async signOut() {
        try {
            await (0, auth_1.signOut)(config_1.default.getAuth());
        }
        catch (error) {
            console.error('Sign out failed:', error);
            throw error;
        }
    }
    // 인증 상태 변화 감지
    onAuthStateChanged(callback) {
        return (0, auth_1.onAuthStateChanged)(config_1.default.getAuth(), (user) => {
            callback(user ? this.mapUserToAuthUser(user) : null);
        });
    }
    // 현재 사용자 가져오기
    getCurrentUser() {
        const user = config_1.default.getAuth().currentUser;
        return user ? this.mapUserToAuthUser(user) : null;
    }
    // 프로필 업데이트
    async updateUserProfile(updates) {
        const user = config_1.default.getAuth().currentUser;
        if (!user) {
            throw new Error('No authenticated user found');
        }
        try {
            await (0, auth_1.updateProfile)(user, updates);
        }
        catch (error) {
            console.error('Profile update failed:', error);
            throw error;
        }
    }
    mapUserToAuthUser(user) {
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAnonymous: user.isAnonymous,
        };
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
exports.default = exports.authService;
//# sourceMappingURL=auth.js.map