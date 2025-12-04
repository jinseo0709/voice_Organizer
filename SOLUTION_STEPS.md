# Voice Organizer V2 - 문제 해결 순서

**작성일**: 2025-12-04

---

## Phase 1: 긴급 보안 조치 (1-2일)

### Step 1: Firebase Storage 보안 규칙 수정

**파일**: `storage.rules`

**현재 (위험)**:
```javascript
match /{allPaths=**} {
  allow read, write: if true;
}
```

**수정 내용**:
```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // 기본: 모든 접근 차단
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // 인증된 사용자의 개인 파일만 허용
    match /uploads/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 임시 파일 - 인증된 사용자만
    match /temp-audio/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**적용 명령**:
```bash
firebase deploy --only storage
```

---

### Step 2: 하드코딩된 API 키 제거

**파일**: `apps/web/src/lib/firebase.ts`

**현재 (위험)**:
```typescript
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBqE_XHdmQ8DqPwxKJyQxzV7Ns9BcEfGhI",
  // ...
};
```

**수정 내용**:
```typescript
// Firebase 설정 - 환경 변수 필수
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 누락된 환경 변수 확인
const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0 && typeof window !== 'undefined') {
  console.error('필수 Firebase 환경 변수 누락:', missingVars);
}

export const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey || '',
  authDomain: requiredEnvVars.authDomain || '',
  projectId: requiredEnvVars.projectId || '',
  storageBucket: requiredEnvVars.storageBucket || '',
  messagingSenderId: requiredEnvVars.messagingSenderId || '',
  appId: requiredEnvVars.appId || '',
};

export { firebase, authService, firestoreService, storageService } from '@voice-organizer/firebase';
```

**추가 작업**:
1. Firebase Console에서 새 API 키 생성
2. 기존 노출된 키 비활성화
3. `.env.local` 파일에 새 키 설정

---

### Step 3: CORS 정책 강화

**파일**: `server/server.js`

**현재 (위험)**:
```javascript
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);  // 모든 출처 허용
  },
}));
```

**수정 내용**:
```javascript
// 환경별 허용 도메인 설정
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://voice-organizer-app.web.app',
      'https://voice-organizer-app.firebaseapp.com'
    ]
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

app.use(cors({
  origin: function (origin, callback) {
    // 서버-서버 통신 또는 같은 출처 요청 허용
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS 차단: ${origin}`);
      callback(new Error('CORS 정책에 의해 차단되었습니다'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

**파일**: `cors-config.json` 수정

```json
[
  {
    "origin": [
      "https://voice-organizer-app.web.app",
      "https://voice-organizer-app.firebaseapp.com"
    ],
    "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization"
    ],
    "maxAgeSeconds": 3600
  }
]
```

---

### Step 4: Firebase Authentication 구현

**파일**: `apps/web/src/contexts/AuthContext.tsx`

**전체 수정**:
```typescript
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import { User } from '@voice-organizer/shared';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Firebase User를 앱 User로 변환
function mapFirebaseUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
    photoURL: firebaseUser.photoURL || '',
    isAnonymous: firebaseUser.isAnonymous,
    createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
    updatedAt: new Date(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**새 파일 생성**: `apps/web/src/lib/firebaseClient.ts`

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './firebase';

// Firebase 앱 초기화 (중복 방지)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
```

---

## Phase 2: 코드 품질 개선 (1-2주)

### Step 5: 환경 변수 설정 파일 업데이트

**파일**: `.env.example` 수정

```bash
# ========================================
# Firebase Configuration (필수)
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_firebase_app_id"

# ========================================
# Google Cloud Platform (필수)
# ========================================
GOOGLE_CLOUD_PROJECT_ID="your_gcp_project_id"
GOOGLE_CLOUD_KEY_FILE="./serviceAccountKey.json"

# ========================================
# Google AI Studio - Gemini API (필수)
# ========================================
GOOGLE_AI_API_KEY="your_google_ai_api_key"

# ========================================
# Cloud Run Server (필수)
# ========================================
CLOUD_RUN_SERVER_URL="https://your-server.run.app"

# ========================================
# Runtime Configuration
# ========================================
NODE_ENV="development"
NEXT_PUBLIC_USE_REAL_SERVICES="true"
LOG_LEVEL="info"
```

---

### Step 6: Cloud Run URL 환경 변수화

**파일**: `apps/web/src/app/api/speech-to-text/route.ts`

**수정 내용**:
```typescript
import { NextRequest, NextResponse } from 'next/server';

// 환경 변수에서 Cloud Run URL 로드
const CLOUD_RUN_URL = process.env.CLOUD_RUN_SERVER_URL;

if (!CLOUD_RUN_URL) {
  console.error('CLOUD_RUN_SERVER_URL 환경 변수가 설정되지 않았습니다.');
}

export async function POST(request: NextRequest) {
  try {
    if (!CLOUD_RUN_URL) {
      return NextResponse.json({
        success: false,
        error: 'Cloud Run 서버 URL이 설정되지 않았습니다.'
      }, { status: 500 });
    }

    console.log('🔄 프록시: Cloud Run 서버로 요청 전달 시작...');

    // ... 나머지 코드 동일
  } catch (error) {
    // ...
  }
}
```

---

### Step 7: firebase-admin 버전 통일

**파일**: `server/package.json`

**수정 내용**:
```json
{
  "dependencies": {
    "firebase-admin": "^13.6.0"
  }
}
```

**적용 명령**:
```bash
cd server
npm install firebase-admin@^13.6.0
```

---

### Step 8: 서버 환경 변수 검증 강화

**파일**: `server/server.js` 상단에 추가

```javascript
require('dotenv').config();

// 필수 환경 변수 검증
const requiredEnvVars = [
  'GOOGLE_CLOUD_PROJECT',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 필수 환경 변수가 설정되지 않았습니다:');
  missingVars.forEach(v => console.error(`   - ${v}`));

  if (process.env.NODE_ENV === 'production') {
    console.error('프로덕션 환경에서는 모든 환경 변수가 필요합니다. 종료합니다.');
    process.exit(1);
  } else {
    console.warn('⚠️  개발 환경: 일부 기능이 제한될 수 있습니다.');
  }
}

// ... 나머지 코드
```

---

### Step 9: 테스트 프레임워크 설정

**9.1 패키지 설치**:
```bash
cd apps/web
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**9.2 새 파일 생성**: `apps/web/jest.config.js`

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};

module.exports = createJestConfig(customJestConfig);
```

**9.3 새 파일 생성**: `apps/web/jest.setup.ts`

```typescript
import '@testing-library/jest-dom';
```

**9.4 package.json 스크립트 추가**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

**9.5 예시 테스트 파일**: `apps/web/src/__tests__/example.test.ts`

```typescript
describe('Example Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## Phase 3: 보안 강화 (2-4주)

### Step 10: Firestore 보안 규칙 개선

**파일**: `firestore.rules`

**수정할 부분 - conversations 컬렉션**:
```javascript
// 기존 (문제)
match /conversations/{conversationId} {
  allow read, write: if isOwner(resource.data.userId);
}

// 수정
match /conversations/{conversationId} {
  allow read: if isAuthenticated() &&
    resource.data.userId == request.auth.uid;
  allow create: if isAuthenticated() &&
    request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated() &&
    resource.data.userId == request.auth.uid;
}
```

**적용 명령**:
```bash
firebase deploy --only firestore:rules
```

---

### Step 11: Rate Limiting 구현

**11.1 패키지 설치**:
```bash
cd server
npm install express-rate-limit
```

**11.2 파일 수정**: `server/server.js`

```javascript
const rateLimit = require('express-rate-limit');

// 일반 API 제한
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // IP당 100회
  message: {
    success: false,
    error: '요청이 너무 많습니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speech API 제한 (비용이 높으므로 더 엄격)
const speechLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 50, // IP당 50회
  message: {
    success: false,
    error: '음성 인식 요청 한도를 초과했습니다. 1시간 후 다시 시도해주세요.'
  },
});

// 적용
app.use('/api/', generalLimiter);
app.use('/api/speech-to-text', speechLimiter);
```

---

### Step 12: 입력 검증 추가 (Zod)

**12.1 패키지 설치**:
```bash
cd apps/web
npm install zod
```

**12.2 파일 수정**: `apps/web/src/app/api/gemini-analysis/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';

// 요청 스키마 정의
const AnalysisRequestSchema = z.object({
  text: z.string()
    .min(1, '분석할 텍스트가 비어있습니다.')
    .max(10000, '텍스트가 너무 깁니다. (최대 10,000자)'),
  options: z.object({
    language: z.string().optional(),
    maxKeywords: z.number().min(1).max(10).optional(),
  }).optional().default({}),
});

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await request.json();

    // Zod 검증
    const validationResult = AnalysisRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || '잘못된 요청입니다.';
      return NextResponse.json({
        success: false,
        error: errorMessage
      }, { status: 400 });
    }

    const { text, options } = validationResult.data;

    // ... 나머지 로직
  } catch (error) {
    // ...
  }
}
```

---

## Phase 4: 유지보수성 개선 (1-2개월)

### Step 13: 구조화된 로깅 시스템

**13.1 패키지 설치**:
```bash
npm install pino pino-pretty
```

**13.2 새 파일 생성**: `packages/shared/src/logger.ts`

```typescript
import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
  base: {
    service: 'voice-organizer',
  },
});

// 사용 예시
// logger.info({ action: 'speech-to-text', fileSize: 1024 }, '음성 인식 시작');
// logger.error({ error, userId: '123' }, '분석 실패');
```

---

### Step 14: 에러 처리 표준화

**새 파일 생성**: `packages/shared/src/errors.ts`

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = '인증이 필요합니다.') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = '접근 권한이 없습니다.') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = '리소스') {
    super(`${resource}를 찾을 수 없습니다.`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class AIServiceError extends AppError {
  constructor(message: string = 'AI 서비스 오류가 발생했습니다.') {
    super(message, 'AI_SERVICE_ERROR', 503);
    this.name = 'AIServiceError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = '요청 한도를 초과했습니다.') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}
```

---

### Step 15: TypeScript 설정 강화

**파일**: `apps/web/tsconfig.json` 수정

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## 체크리스트

### Phase 1 완료 확인 (긴급)
- [ ] Step 1: Storage 보안 규칙 배포 완료
- [ ] Step 2: API 키 교체 및 코드 수정 완료
- [ ] Step 3: CORS 정책 수정 및 배포 완료
- [ ] Step 4: Firebase Authentication 구현 완료

### Phase 2 완료 확인 (단기)
- [ ] Step 5: 환경 변수 파일 업데이트
- [ ] Step 6: Cloud Run URL 환경 변수화
- [ ] Step 7: firebase-admin 버전 통일
- [ ] Step 8: 서버 환경 변수 검증 강화
- [ ] Step 9: 테스트 프레임워크 설정

### Phase 3 완료 확인 (중기)
- [ ] Step 10: Firestore 보안 규칙 개선
- [ ] Step 11: Rate Limiting 구현
- [ ] Step 12: Zod 입력 검증 추가

### Phase 4 완료 확인 (장기)
- [ ] Step 13: 구조화된 로깅 시스템
- [ ] Step 14: 에러 처리 표준화
- [ ] Step 15: TypeScript 설정 강화

---

## 배포 순서

```bash
# 1. 보안 규칙 배포
firebase deploy --only storage
firebase deploy --only firestore:rules

# 2. 서버 재배포
cd server
gcloud run deploy voice-organizer-server --source . --region asia-northeast3

# 3. 웹 앱 재배포
cd apps/web
npm run build
firebase deploy --only hosting

# 4. 전체 테스트
npm run test
```
