// Firebase 설정
export { firebase, type FirebaseConfig } from './config';

// 인증 서비스
export { authService, AuthService, type AuthUser } from './auth';

// Firestore 서비스
export {
  firestoreService,
  FirestoreService,
  type FirestoreVoiceMemo
} from './firestore';

// Storage 서비스
export {
  storageService,
  StorageService,
  type UploadProgress,
  type UploadResult
} from './storage';

// 기본 내보내기용 import
import { firebase } from './config';
import { authService } from './auth';
import { firestoreService } from './firestore';
import { storageService } from './storage';

// 타입 정의
export interface FirebaseServices {
  firebase: typeof firebase;
  authService: typeof authService;
  firestoreService: typeof firestoreService;
  storageService: typeof storageService;
}

const firebaseServices: FirebaseServices = {
  firebase,
  authService,
  firestoreService,
  storageService,
};

export default firebaseServices;