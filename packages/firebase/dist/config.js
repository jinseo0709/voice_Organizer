"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.firebase = void 0;
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
class FirebaseService {
    app = null;
    auth = null;
    firestore = null;
    storage = null;
    initialized = false;
    async initialize(config) {
        // 이미 초기화되었으면 중복 초기화 방지
        if (this.initialized && this.app) {
            console.log('✅ Firebase already initialized - skipping');
            return;
        }
        // 클라이언트 사이드에서만 초기화
        if (typeof globalThis !== 'undefined' && typeof globalThis.window === 'undefined') {
            console.warn('⚠️ Firebase initialization skipped on server side');
            return;
        }
        try {
            console.log('🔥 Starting Firebase client initialization...');
            // Firebase 앱 초기화 (중복 방지)
            try {
                this.app = (0, app_1.initializeApp)(config);
                console.log('✅ Firebase App initialized successfully');
            }
            catch (error) {
                if (error instanceof Error && error.message.includes('already exists')) {
                    console.log('✅ Firebase App already exists - using existing instance');
                    // 기존 앱 가져오기
                    const { getApps } = await Promise.resolve().then(() => __importStar(require('firebase/app')));
                    const apps = getApps();
                    this.app = apps.length > 0 ? apps[0] : null;
                    if (!this.app) {
                        throw new Error('Failed to get existing Firebase app');
                    }
                }
                else {
                    throw error;
                }
            }
            // 서비스들 초기화
            this.auth = (0, auth_1.getAuth)(this.app);
            console.log('✅ Firebase Auth service ready');
            this.firestore = (0, firestore_1.getFirestore)(this.app);
            console.log('✅ Firestore service ready');
            this.storage = (0, storage_1.getStorage)(this.app);
            console.log('✅ Firebase Storage service ready');
            this.initialized = true;
            console.log('🎉 All Firebase services initialized successfully');
        }
        catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            this.initialized = false;
            throw error;
        }
    }
    getApp() {
        if (!this.app) {
            throw new Error('Firebase not initialized. Call initialize() first.');
        }
        return this.app;
    }
    getAuth() {
        if (!this.auth) {
            throw new Error('Firebase Auth not initialized.');
        }
        return this.auth;
    }
    getFirestore() {
        if (!this.firestore) {
            throw new Error('Firestore not initialized.');
        }
        return this.firestore;
    }
    getStorage() {
        if (!this.storage) {
            throw new Error('Firebase Storage not initialized.');
        }
        return this.storage;
    }
}
exports.firebase = new FirebaseService();
exports.default = exports.firebase;
//# sourceMappingURL=config.js.map