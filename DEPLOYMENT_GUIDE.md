# Voice Organizer V2 - 배포 가이드

**작성일**: 2025-12-04

이 문서는 프로젝트를 처음부터 작동시키기 위한 전체 과정을 순서대로 설명합니다.

---

## 목차

1. [사전 준비](#1-사전-준비)
2. [Firebase 프로젝트 설정](#2-firebase-프로젝트-설정)
3. [GCP 설정](#3-gcp-설정)
4. [환경 변수 설정](#4-환경-변수-설정)
5. [로컬 개발 환경 실행](#5-로컬-개발-환경-실행)
6. [프로덕션 배포](#6-프로덕션-배포)
7. [배포 확인](#7-배포-확인)

---

## 1. 사전 준비

### 1.1 필수 도구 설치 확인

```bash
# Node.js 버전 확인 (v18 이상 필요)
node --version

# npm 버전 확인
npm --version

# Firebase CLI 설치/업데이트
npm install -g firebase-tools

# Google Cloud CLI 설치 확인
gcloud --version
```

### 1.2 프로젝트 의존성 설치

```bash
cd c:\Users\user\voice_Organizer

# 루트 의존성 설치
npm install

# 모든 워크스페이스 의존성 설치
npm install --workspaces
```

---

## 2. Firebase 프로젝트 설정

### 2.1 Firebase 로그인

```bash
# Firebase 로그인
firebase login

# 현재 로그인된 계정 확인
firebase projects:list
```

### 2.2 Firebase 프로젝트 선택/생성

**옵션 A: 기존 프로젝트 사용 (권한 필요)**
```bash
# voice-organizer-480015 프로젝트 사용
firebase use voice-organizer-480015
```

**옵션 B: 새 프로젝트 생성**
```bash
# Firebase Console에서 새 프로젝트 생성 후
firebase use <새-프로젝트-id>

# 또는 .firebaserc 수정
```

### 2.3 Firebase 서비스 활성화

Firebase Console (https://console.firebase.google.com)에서:

1. **Authentication 활성화**
   - Authentication > Sign-in method
   - 이메일/비밀번호 활성화
   - (선택) Google 로그인 활성화

2. **Firestore Database 생성**
   - Firestore Database > 데이터베이스 만들기
   - 위치: asia-northeast3 (서울)
   - 프로덕션 모드로 시작

3. **Storage 활성화**
   - Storage > 시작하기
   - 위치: asia-northeast3

### 2.4 Firebase 보안 규칙 배포

```bash
cd c:\Users\user\voice_Organizer

# Firestore 규칙 배포
firebase deploy --only firestore:rules

# Storage 규칙 배포
firebase deploy --only storage
```

---

## 3. GCP 설정

### 3.1 GCP 프로젝트 설정

```bash
# GCP 로그인
gcloud auth login

# 프로젝트 설정
gcloud config set project voice-organizer-480015
```

### 3.2 필요한 API 활성화

```bash
# Speech-to-Text API
gcloud services enable speech.googleapis.com

# Cloud Storage API
gcloud services enable storage.googleapis.com

# Cloud Run API
gcloud services enable run.googleapis.com

# Cloud Build API (배포용)
gcloud services enable cloudbuild.googleapis.com
```

### 3.3 서비스 계정 키 생성

```bash
# 서비스 계정 생성
gcloud iam service-accounts create voice-organizer-sa \
  --display-name="Voice Organizer Service Account"

# 필요한 역할 부여
gcloud projects add-iam-policy-binding voice-organizer-480015 \
  --member="serviceAccount:voice-organizer-sa@voice-organizer-480015.iam.gserviceaccount.com" \
  --role="roles/speech.client"

gcloud projects add-iam-policy-binding voice-organizer-480015 \
  --member="serviceAccount:voice-organizer-sa@voice-organizer-480015.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# 키 파일 생성
gcloud iam service-accounts keys create ./serviceAccountKey.json \
  --iam-account=voice-organizer-sa@voice-organizer-480015.iam.gserviceaccount.com
```

### 3.4 Google AI API 키 발급

1. https://makersuite.google.com/app/apikey 접속
2. "Create API Key" 클릭
3. 프로젝트 선택 후 키 생성
4. 생성된 키 복사 (나중에 환경 변수에 사용)

---

## 4. 환경 변수 설정

### 4.1 웹 앱 환경 변수 파일 생성

```bash
cd c:\Users\user\voice_Organizer\apps\web
```

**파일 생성**: `.env.local`

```bash
# ========================================
# Firebase Configuration
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY="여기에_Firebase_API_키"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="voice-organizer-480015.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="voice-organizer-480015"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="voice-organizer-480015.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="여기에_Sender_ID"
NEXT_PUBLIC_FIREBASE_APP_ID="여기에_App_ID"

# ========================================
# Google Cloud Platform
# ========================================
GOOGLE_CLOUD_PROJECT_ID="voice-organizer-480015"
GOOGLE_CLOUD_KEY_FILE="./serviceAccountKey.json"

# ========================================
# Google AI (Gemini API)
# ========================================
GOOGLE_AI_API_KEY="여기에_Gemini_API_키"

# ========================================
# Cloud Run Server URL
# ========================================
CLOUD_RUN_SERVER_URL="https://voice-organizer-server-565683939264.asia-northeast3.run.app"

# ========================================
# Runtime
# ========================================
NODE_ENV="development"
NEXT_PUBLIC_USE_REAL_SERVICES="true"
```

**Firebase 설정값 찾는 방법**:
1. Firebase Console > 프로젝트 설정 > 일반
2. "내 앱" 섹션에서 웹 앱 선택
3. SDK 설정 및 구성 > Config 복사

### 4.2 서버 환경 변수 파일 생성

```bash
cd c:\Users\user\voice_Organizer\server
```

**파일 생성**: `.env`

```bash
# GCP Configuration
GOOGLE_CLOUD_PROJECT="voice-organizer-480015"
GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"

# Firebase Configuration
FIREBASE_PROJECT_ID="voice-organizer-480015"
FIREBASE_STORAGE_BUCKET="voice-organizer-480015.firebasestorage.app"

# Server Configuration
PORT=8080
NODE_ENV="development"

# Speech API Configuration
AUDIO_SIZE_THRESHOLD_KB=300
SPEECH_API_LANGUAGE="ko-KR"
SPEECH_API_MODEL_SHORT="latest_short"
SPEECH_API_MODEL_LONG="latest_long"
```

### 4.3 서비스 계정 키 파일 복사

```bash
# 루트에서 생성한 키를 서버 폴더로 복사
cp c:\Users\user\voice_Organizer\serviceAccountKey.json c:\Users\user\voice_Organizer\server\
cp c:\Users\user\voice_Organizer\serviceAccountKey.json c:\Users\user\voice_Organizer\apps\web\
```

---

## 5. 로컬 개발 환경 실행

### 5.1 공유 패키지 빌드

```bash
cd c:\Users\user\voice_Organizer

# 공유 패키지 빌드
npm run build --workspace=packages/shared
npm run build --workspace=packages/firebase
npm run build --workspace=packages/gcp
```

### 5.2 개발 서버 실행

**터미널 1: 백엔드 서버**
```bash
cd c:\Users\user\voice_Organizer\server
npm run dev
```

**터미널 2: 프론트엔드**
```bash
cd c:\Users\user\voice_Organizer\apps\web
npm run dev
```

### 5.3 로컬 테스트

- 웹 앱: http://localhost:3000
- 서버 헬스체크: http://localhost:8080/health

---

## 6. 프로덕션 배포

### 6.1 Cloud Run 서버 배포

```bash
cd c:\Users\user\voice_Organizer\server

# Cloud Run에 배포
gcloud run deploy voice-organizer-server \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=voice-organizer-480015,FIREBASE_PROJECT_ID=voice-organizer-480015,FIREBASE_STORAGE_BUCKET=voice-organizer-480015.firebasestorage.app"
```

### 6.2 웹 앱 빌드

```bash
cd c:\Users\user\voice_Organizer\apps\web

# 프로덕션 빌드
npm run build
```

### 6.3 Next.js 정적 내보내기 설정

**파일 수정**: `apps/web/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // 정적 내보내기 활성화

  // ... 기존 설정 유지
};

export default nextConfig;
```

### 6.4 빌드 후 정적 파일 생성

```bash
cd c:\Users\user\voice_Organizer\apps\web

# 빌드 실행 (out 폴더 생성)
npm run build
```

### 6.5 Firebase Hosting 배포

```bash
cd c:\Users\user\voice_Organizer

# Firebase에 배포
firebase deploy --only hosting
```

---

## 7. 배포 확인

### 7.1 서비스 상태 확인

```bash
# Cloud Run 서버 상태
curl https://voice-organizer-server-565683939264.asia-northeast3.run.app/health

# 웹 앱 상태
curl -I https://voice-organizer-app.web.app
```

### 7.2 기능 테스트 체크리스트

- [ ] 웹 앱 접속 가능
- [ ] 로그인/회원가입 작동
- [ ] 음성 녹음 기능 작동
- [ ] Speech-to-Text 변환 작동
- [ ] Gemini AI 분석 작동
- [ ] 메모 저장/조회 작동

---

## 빠른 참조: 전체 명령어 요약

```bash
# === 1. 초기 설정 ===
cd c:\Users\user\voice_Organizer
npm install
npm install --workspaces

# === 2. Firebase 설정 ===
firebase login
firebase use voice-organizer-480015

# === 3. GCP API 활성화 ===
gcloud auth login
gcloud config set project voice-organizer-480015
gcloud services enable speech.googleapis.com storage.googleapis.com run.googleapis.com

# === 4. 환경 변수 설정 ===
# apps/web/.env.local 생성
# server/.env 생성
# serviceAccountKey.json 복사

# === 5. 패키지 빌드 ===
npm run build --workspace=packages/shared
npm run build --workspace=packages/firebase
npm run build --workspace=packages/gcp

# === 6. 로컬 테스트 ===
# 터미널 1
cd server && npm run dev

# 터미널 2
cd apps/web && npm run dev

# === 7. 프로덕션 배포 ===
# 서버 배포
cd server
gcloud run deploy voice-organizer-server --source . --region asia-northeast3 --allow-unauthenticated

# 웹 앱 배포
cd apps/web
npm run build

cd ../..
firebase deploy --only hosting

# === 8. 보안 규칙 배포 ===
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

## 트러블슈팅

### 문제: Firebase 프로젝트 접근 권한 없음

```
Error: Failed to get Firebase project voice-organizer-480015
```

**해결**:
1. 프로젝트 소유자에게 IAM 권한 요청
2. 또는 새 Firebase 프로젝트 생성 후 `.firebaserc` 수정

### 문제: 빌드 실패

```bash
# 캐시 삭제 후 재시도
rm -rf node_modules
rm -rf apps/web/.next
rm -rf apps/web/out
npm install
npm run build
```

### 문제: Cloud Run 배포 실패

```bash
# 로그 확인
gcloud run services logs read voice-organizer-server --region asia-northeast3
```

### 문제: Speech API 오류

```
Error: Speech API not enabled
```

**해결**:
```bash
gcloud services enable speech.googleapis.com
```
