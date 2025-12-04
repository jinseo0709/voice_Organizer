export { firebase, type FirebaseConfig } from './config';
export { authService, AuthService, type AuthUser } from './auth';
export { firestoreService, FirestoreService, type FirestoreVoiceMemo } from './firestore';
export { storageService, StorageService, type UploadProgress, type UploadResult } from './storage';
import { firebase } from './config';
import { authService } from './auth';
import { firestoreService } from './firestore';
import { storageService } from './storage';
export interface FirebaseServices {
    firebase: typeof firebase;
    authService: typeof authService;
    firestoreService: typeof firestoreService;
    storageService: typeof storageService;
}
declare const firebaseServices: FirebaseServices;
export default firebaseServices;
//# sourceMappingURL=index.d.ts.map