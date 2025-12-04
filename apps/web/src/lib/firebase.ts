// Firebase 설정만 export하는 파일로 변경
// 실제 초기화는 page.tsx에서 수행

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBqE_XHdmQ8DqPwxKJyQxzV7Ns9BcEfGhI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "voice-organizer-480015.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "voice-organizer-480015",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "voice-organizer-480015.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "987654321098",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:987654321098:web:a1b2c3d4e5f6g7h8i9"
};

// 패키지 export
export { firebase, authService, firestoreService, storageService } from '@voice-organizer/firebase';