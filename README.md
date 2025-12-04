# 🎙️ Voice Organizer - AI 음성 텍스트 관리 시스템

실시간 음성 인식과 AI 분석을 통한 스마트 음성 텍스트 관리 시스템입니다.

## 🚀 주요 기능

- **🎤 음성-텍스트 변환**: GCP Speech-to-Text API 기반 고품질 음성 인식
- **🤖 AI 텍스트 분석**: Google Gemini Pro를 통한 지능형 텍스트 분석
- **📂 스마트 카테고리**: AI 기반 자동 카테고리 분류 및 태깅
- **☁️ 클라우드 연동**: Firebase + GCP Cloud Run 완전 클라우드 아키텍처
- **📱 실시간 처리**: 업로드부터 분석까지 완전 자동화된 파이프라인

## 🏗️ 시스템 아키텍처

```
[사용자] → [Next.js 앱] → [프록시 API] → [Cloud Run 서버] → [GCP Speech API]
    ↓
[Gemini AI 분석] → [카테고리 분류] → [Firebase 저장] → [결과 표시]
```

## 📁 프로젝트 구조

```
Voice_Organizer_V2/
├── apps/
│   └── web/                    # Next.js 16.0.6 프론트엔드
│       ├── src/
│       │   ├── components/     # React 컴포넌트
│       │   ├── lib/           # 유틸리티 & 서비스
│       │   └── app/           # Next.js App Router
├── server/                     # GCP Cloud Run 서버
│   ├── server.js              # Express.js 백엔드
│   ├── Dockerfile             # 컨테이너 설정
│   └── package.json           # 서버 의존성
├── packages/
│   └── firebase/              # Firebase 설정 패키지
└── serviceAccountKey.json     # GCP 서비스 계정 (보안)
```

## 🛠️ 기술 스택

### Frontend
- **Next.js 16.0.6**: React 19.2.0 기반 풀스택 프레임워크
- **TypeScript**: 타입 안정성
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **Firebase SDK v9+**: 실시간 데이터베이스 및 인증

### Backend
- **GCP Cloud Run**: 서버리스 컨테이너 플랫폼
- **Express.js**: Node.js 웹 프레임워크
- **GCP Speech-to-Text API**: 음성 인식 엔진
- **Firebase Admin SDK**: 서버사이드 Firebase 연동

### AI & Analytics  
- **Google AI Studio**: Gemini Pro 모델 API
- **@google/generative-ai**: Gemini AI JavaScript SDK
- **자동 카테고리 분류**: AI 기반 텍스트 분석

### Infrastructure
- **Firebase**: 인증, Firestore, Storage
- **GCP Cloud Run**: 프로덕션 서버 배포
- **Docker**: 컨테이너화
- **Turbo**: 모노레포 빌드 시스템

## 🔧 환경 설정

### 필수 환경 변수 (.env.local)

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="voice-organizer-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="voice-organizer-app"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="voice-organizer-app.firebasestorage.app"

# Google Cloud Platform
GOOGLE_CLOUD_PROJECT_ID="voice-organizer-480015"
GOOGLE_CLOUD_CREDENTIALS='{"type":"service_account",...}'

# Google AI Studio (Gemini API)
GOOGLE_AI_API_KEY="your_gemini_api_key"

# Production Mode
NODE_ENV="production"
NEXT_PUBLIC_USE_REAL_SERVICES="true"
```

## 🚀 설치 및 실행

### 1. 프로젝트 클론 및 의존성 설치
```bash
git clone <repository-url>
cd Voice_Organizer_V2
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env.local
# .env.local 파일에서 API 키들 설정
```

### 3. 개발 서버 실행
```bash
# Turbo를 통한 전체 개발 환경 시작
npm run dev

# 또는 개별 앱 실행
cd apps/web
npm run dev
```

### 4. 프로덕션 배포
```bash
# Cloud Run 서버 배포
cd server
gcloud run deploy voice-organizer-server --source .

# 프론트엔드 빌드
cd apps/web
npm run build
```

## 🎯 주요 API 엔드포인트

### 음성-텍스트 변환
```
POST /api/speech-to-text
Content-Type: multipart/form-data

Form Data:
- audio: File (WEBM, MP3, WAV)
- options: JSON (언어 설정, 모델 옵션)
```

### Gemini AI 텍스트 분석
```
POST /api/gemini-analysis  
Content-Type: application/json

Body:
{
  "text": "분석할 텍스트",
  "options": {
    "enableSentiment": true,
    "enableKeywords": true,
    "enableSummary": true
  }
}
```

## 🔄 음성 처리 플로우

1. **음성 업로드**: Firebase Storage에 오디오 파일 저장
2. **음성-텍스트 변환**: GCP Speech API를 통한 텍스트 변환
3. **AI 분석**: Gemini Pro를 통한 텍스트 분석 및 카테고리 분류
4. **데이터 저장**: Firestore에 분석 결과 저장
5. **결과 표시**: 실시간으로 사용자에게 결과 제공

## 📊 성능 최적화

- **파일 크기 임계값**: 300KB 기준으로 처리 방법 자동 선택
- **오디오 최적화**: WEBM Opus, 48kHz, 모노 설정
- **프록시 아키텍처**: CORS 문제 해결 및 보안 강화
- **캐싱**: Turbo 빌드 캐싱으로 개발 속도 향상

## 🔐 보안 및 인증

- **Firebase Authentication**: 사용자 인증 관리
- **Service Account**: GCP 서비스 간 안전한 통신
- **환경 변수**: 민감한 정보 보호
- **CORS 정책**: 적절한 접근 제어

## 🌐 배포된 서비스

- **Cloud Run 서버**: `https://voice-organizer-server-565683939264.asia-northeast3.run.app`
- **Firebase 프로젝트**: `voice-organizer-app`
- **GCP 프로젝트**: `voice-organizer-480015`

## 📝 개발 로그

### 최근 업데이트 (2025-12-04)
- ✅ Google AI Studio API 통합 완료
- ✅ Gemini Pro 모델을 통한 텍스트 분석 구현
- ✅ 자동 카테고리 분류 시스템 구축
- ✅ Cloud Run 프로덕션 서버 배포
- ✅ 프로젝트 구조 정리 및 최적화

## 🔧 문제 해결

### 일반적인 이슈
1. **서버 연결 오류**: Cloud Run 서비스 상태 확인
2. **음성 인식 실패**: 오디오 포맷 및 품질 확인
3. **API 키 오류**: 환경 변수 설정 확인
4. **빌드 에러**: 의존성 재설치 (`npm install`)

### 디버깅
```bash
# Cloud Run 서비스 헬스체크
curl https://voice-organizer-server-565683939264.asia-northeast3.run.app/health

# 로컬 개발 서버 확인
npm run dev
```

## 🤝 기여

이 프로젝트는 개인 프로젝트이지만 피드백과 제안은 언제나 환영합니다.

## 📄 라이선스

Private Project - All Rights Reserved

---
**🎙️ Voice Organizer** - AI 기반 스마트 음성 텍스트 관리 시스템