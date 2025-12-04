import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
}
declare class FirebaseService {
    private app;
    private auth;
    private firestore;
    private storage;
    private initialized;
    initialize(config: FirebaseConfig): Promise<void>;
    getApp(): FirebaseApp;
    getAuth(): Auth;
    getFirestore(): Firestore;
    getStorage(): FirebaseStorage;
}
export declare const firebase: FirebaseService;
export default firebase;
//# sourceMappingURL=config.d.ts.map