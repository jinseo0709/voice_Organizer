# 🎙️ Voice Organizer V2

**AI 기반 스마트 음성 메모 관리 시스템**

음성을 녹음하거나 파일을 업로드하면 AI가 자동으로 텍스트 변환, 카테고리 분류, 요약을 수행하는 웹 애플리케이션입니다.

---

## 🌐 배포 URL

| 서비스 | URL |
|--------|-----|
| **웹 애플리케이션** | https://voice-organizer-480015.web.app |
| **API 서버** | https://voice-organizer-server-565683939264.asia-northeast1.run.app |

---

## ✨ 주요 기능

### 🎤 음성 입력
- **실시간 녹음**: 브라우저에서 직접 마이크로 녹음
- **파일 업로드**: MP3, WAV, M4A, AAC, WebM, OGG 지원 (최대 50MB)
- **드래그 앤 드롭**: 파일을 끌어다 놓기만 하면 업로드

### 🤖 AI 자동 분석 (Google Gemini)
- **음성 → 텍스트 변환**: Google Speech-to-Text API
- **스마트 카테고리 분류**:
  | 카테고리 | 설명 | 특별 기능 |
  |---------|------|----------|
  | 🛒 쇼핑리스트 | 구매 품목 정리 | 장바구니 담기/완료 체크 |
  | ✅ 투두리스트 | 할 일 목록 | 체크박스로 완료 표시 |
  | 📅 약속 일정 | 미팅, 약속 | **Google 캘린더 연동** |
  | 📚 학교 수업 과제 | 과제, 시험 일정 | 체크박스로 완료 표시 |
  | 💡 아이디어 | 아이디어, 메모 | AI 보충 의견 + 완료 체크 |
  | 📝 기타 | 분류 불가 항목 | - |
- **항목별 리스트 분리**: 각 카테고리 내 항목을 개별 리스트로 추출
- **AI 보충 의견**: 아이디어 카테고리에 AI의 추가 제안

### 📱 UI/UX 디자인
- **미니멀 디자인**: Teal & Lavender 색상 팔레트
- **Pretendard 폰트**: 한국어에 최적화된 타이포그래피
- **음성 파형 애니메이션**: 헤더 및 업로드 영역에 동적 파형
- **반응형 레이아웃**: 모바일/태블릿/데스크톱 지원
- **PWA 지원**: 앱처럼 설치 가능, 오프라인 캐시

### 📆 캘린더 연동
- **Google Calendar 연동**: 약속 일정을 바로 캘린더에 추가
- **날짜/시간 자동 파싱**: "내일 오후 3시", "12월 15일" 등 자연어 인식
- **장소 자동 추출**: "강남역에서", "카페에서" 등 장소 인식

### 🗂️ 메모 관리
- **실시간 동기화**: Firestore 실시간 구독
- **완료 필터**: 완료된 항목만 모아보기
- **카테고리 필터**: 특정 카테고리만 보기
- **검색 기능**: 메모 내용 검색
- **원본 음성 재생**: 저장된 음성 파일 재생

---

## 📱 사용 방법

### 1. 웹사이트 접속
브라우저에서 **https://voice-organizer-480015.web.app** 접속

### 2. 로그인
| 로그인 방식 | 설명 |
|------------|------|
| **Google 로그인** | Google 계정으로 간편 로그인 |
| **이메일 로그인** | 이메일과 비밀번호로 로그인/회원가입 |
| **익명 로그인** | 계정 없이 바로 사용 |
| **데모 모드** | 로그인 없이 기능 체험 |

### 3. 음성 메모 생성


**방법 1: 파일 업로드**
1. 📁 파일 업로드 영역 클릭 또는 드래그 앤 드롭
2. 지원 형식: MP3, WAV, M4A, AAC, WebM, OGG

### 4. AI 분석 결과 확인
- 텍스트 변환 결과
- 카테고리별 분류
- 항목별 리스트
- AI 보충 의견 (아이디어 카테고리)

### 5. 메모 관리
- ✅ 체크박스로 완료 표시
- 🛒 장바구니 담기 (쇼핑리스트)
- 📅 캘린더 추가 (약속 일정)
- 🔊 원본 음성 재생
- 🗑️ 삭제

---

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      사용자 브라우저                          │
│              (PWA 지원, 오프라인 캐시, 반응형)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Hosting                          │
│              (Next.js 16 정적 사이트 호스팅)                   │
│          https://voice-organizer-480015.web.app              │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Firebase Auth   │ │ Cloud Firestore  │ │ Firebase Storage │
│  ─────────────   │ │  ─────────────   │ │  ─────────────   │
│  • Google 로그인  │ │  • 메모 저장      │ │  • 음성 파일     │
│  • Email 로그인   │ │  • 실시간 동기화   │ │  • 업로드/저장    │
│  • 익명 로그인    │ │  • 사용자별 분리   │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Run API 서버                      │
│     https://voice-organizer-server-...run.app               │
│  ─────────────────────────────────────────────────────────  │
│  • /api/speech-to-text     (음성 → 텍스트)                   │
│  • /api/gemini-analysis    (AI 분석)                         │
│  • /api/text-analysis      (텍스트 분석)                     │
│  • /health                 (상태 확인)                       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   GCP Speech-    │ │   Google Gemini  │ │   Google Cloud   │
│    to-Text       │ │      AI API      │ │     Storage      │
│  ─────────────   │ │  ─────────────   │ │  ─────────────   │
│  음성 인식        │ │  텍스트 분석      │ │  임시 파일 저장   │
│  다국어 지원      │ │  카테고리 분류    │ │  오디오 변환      │
│                  │ │  요약 생성        │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## 🛠️ 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 16.x | React 프레임워크 (Static Export) |
| TypeScript | 5.x | 타입 안전성 |
| Tailwind CSS | 4.x | 유틸리티 기반 스타일링 |
| Pretendard | 1.3.9 | 한국어 최적화 폰트 |
| Lucide React | - | 미니멀 아이콘 |
| date-fns | - | 날짜 포맷팅 |

### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| Node.js | 18+ | 런타임 |
| Express | 4.x | API 서버 프레임워크 |
| Multer | - | 파일 업로드 처리 |
| FFmpeg | - | 오디오 포맷 변환 |

### AI & Cloud Services
| 서비스 | 용도 |
|--------|------|
| **Google Speech-to-Text** | 음성 → 텍스트 변환 |
| **Google Gemini AI** | 텍스트 분석, 카테고리 분류, 요약 |
| **Firebase Authentication** | 사용자 인증 (Google, Email, Anonymous) |
| **Cloud Firestore** | NoSQL 실시간 데이터베이스 |
| **Firebase Storage** | 음성 파일 저장소 |
| **Firebase Hosting** | 정적 웹 호스팅 |
| **Cloud Run** | 서버리스 컨테이너 |

### Build Tools
| 도구 | 용도 |
|------|------|
| Turborepo | 모노레포 빌드 시스템 |
| pnpm | 패키지 매니저 |

---

## 📁 프로젝트 구조

```
Voice_Organizer_V2/
├── apps/
│   └── web/                          # Next.js 웹 애플리케이션
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── globals.css       # 전역 스타일 (Teal 테마, 파형 애니메이션)
│       │   │   ├── layout.tsx        # 레이아웃 (Pretendard 폰트)
│       │   │   ├── page.tsx          # 메인 페이지
│       │   │   ├── auth/             # 인증 페이지
│       │   │   └── api/              # API Routes (프록시)
│       │   ├── components/
│       │   │   ├── VoiceOrganizerApp.tsx  # 🎯 메인 앱 컴포넌트
│       │   │   ├── audio/
│       │   │   │   ├── AudioFileUpload.tsx   # 파일 업로드 (파형 애니메이션)
│       │   │   │   ├── VoiceProcessor.tsx    # 음성 처리 통합
│       │   │   │   ├── ProcessingResults.tsx # 분석 결과 표시
│       │   │   │   └── ProcessingStatus.tsx  # 처리 상태 표시
│       │   │   ├── voice/
│       │   │   │   ├── VoiceMemoList.tsx     # 🎯 메모 목록 (카테고리별 UI)
│       │   │   │   └── VoiceRecorder.tsx     # 음성 녹음기
│       │   │   ├── calendar/
│       │   │   │   └── CalendarView.tsx      # 캘린더 뷰
│       │   │   ├── auth/
│       │   │   │   ├── ProtectedRoute.tsx    # 인증 보호
│       │   │   │   └── UserMenu.tsx          # 사용자 메뉴
│       │   │   └── ui/                       # shadcn/ui 컴포넌트
│       │   ├── contexts/
│       │   │   └── AuthContext.tsx           # 인증 Context
│       │   ├── lib/
│       │   │   ├── firebase.ts               # Firebase 초기화
│       │   │   ├── auth.ts                   # 인증 유틸리티
│       │   │   └── utils.ts                  # 공통 유틸리티
│       │   └── config/                       # 설정 파일
│       ├── public/
│       │   ├── manifest.json                 # PWA 매니페스트
│       │   ├── sw.js                         # Service Worker
│       │   └── icons/                        # 앱 아이콘
│       └── next.config.ts                    # Next.js 설정
│
├── packages/
│   ├── firebase/                     # Firebase 서비스 패키지
│   │   └── src/
│   │       ├── auth.ts               # 인증 서비스
│   │       ├── firestore.ts          # Firestore 서비스
│   │       ├── storage.ts            # Storage 서비스
│   │       └── config.ts             # Firebase 설정
│   ├── gcp/                          # GCP 서비스 패키지
│   │   └── src/
│   │       ├── speech.ts             # Speech-to-Text
│   │       └── language.ts           # Natural Language
│   └── shared/                       # 공유 패키지
│       └── src/
│           ├── types.ts              # 공통 타입 (VoiceMemo, CategorySummary)
│           ├── schemas.ts            # 스키마 정의
│           └── utils.ts              # 공통 유틸리티
│
├── server/                           # Cloud Run API 서버
│   ├── server.js                     # Express 서버 (음성처리, AI분석)
│   ├── package.json                  # 서버 의존성
│   ├── Dockerfile                    # 컨테이너 설정
│   └── deploy.sh                     # 배포 스크립트
│
├── firebase.json                     # Firebase 설정
├── firestore.rules                   # Firestore 보안 규칙
├── storage.rules                     # Storage 보안 규칙
├── turbo.json                        # Turborepo 설정
└── package.json                      # 루트 의존성
```

---

## 🚀 로컬 개발 환경 설정

### 사전 요구사항
- Node.js 18+
- pnpm
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud CLI (`gcloud`)

### 1. 저장소 클론
```bash
git clone https://github.com/jinseo0709/voice_Organizer.git
cd voice_Organizer
```

### 2. 의존성 설치
```bash
pnpm install
```

### 3. 환경 변수 설정

**Frontend (`apps/web/.env.local`)**:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_API_URL=http://localhost:8080
```

**Server (`server/.env`)**:
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GEMINI_API_KEY=your-gemini-api-key
PORT=8080
```

### 4. 개발 서버 실행
```bash
# 프론트엔드 (루트 디렉토리에서)
npm run dev

# 백엔드 (별도 터미널)
cd server && npm run dev
```

### 5. 브라우저에서 확인
http://localhost:3000 접속

---

## 📦 배포

### Frontend (Firebase Hosting)
```bash
# 빌드
cd apps/web && npm run build

# 배포
firebase deploy --only hosting
```

### Backend (Cloud Run)
```bash
cd server

gcloud run deploy voice-organizer-server \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --project voice-organizer-480015
```

---

## 🔧 API 엔드포인트

### `POST /api/speech-to-text`
음성 파일을 텍스트로 변환

**Request**:
```
Content-Type: multipart/form-data
Body: audio (파일)
```

**Response**:
```json
{
  "success": true,
  "text": "변환된 텍스트",
  "confidence": 0.95
}
```

### `POST /api/gemini-analysis`
Gemini AI를 사용한 텍스트 분석 및 카테고리 분류

**Request**:
```json
{
  "text": "분석할 텍스트"
}
```

**Response**:
```json
{
  "success": true,
  "analysis": {
    "summary": "전체 요약",
    "category": "메인 카테고리",
    "all_categories": [
      {
        "category": "쇼핑리스트",
        "summary_list": ["우유", "계란", "빵"]
      },
      {
        "category": "투두리스트",
        "summary_list": ["보고서 작성", "이메일 확인"]
      },
      {
        "category": "아이디어",
        "summary_list": ["새로운 앱 아이디어"],
        "ai_supplement": "AI의 보충 의견..."
      }
    ],
    "keywords": ["키워드1", "키워드2"],
    "sentiment": "positive"
  }
}
```

### `GET /health`
서버 상태 확인

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-07T..."
}
```

---

## 🎨 디자인 시스템

### 색상 팔레트
| 용도 | 색상 | 설명 |
|------|------|------|
| Primary | Teal (`hsl(175, 45%, 45%)`) | 메인 강조 색상 |
| Secondary | Lavender | 보조 색상 |
| Background | Near-white (`#fafafa`) | 배경색 |
| Text | Dark gray | 본문 텍스트 |

### 타이포그래피
- **폰트**: Pretendard (한국어 최적화)
- **제목**: `font-medium`
- **본문**: `font-light`

### 아이콘
- **스타일**: Lucide React
- **굵기**: `stroke-[1.5]` (미니멀 라인)

### 애니메이션
- **음성 파형**: `wave-pulse-smooth` (업로드 영역)
- **호버 효과**: `scale`, `shadow` 전환
- **완료 효과**: `bounce-once`
- **에러 효과**: `shake`

---

## 🔐 보안

- **Firebase Authentication**: 사용자 인증 (Google, Email, Anonymous)
- **Firestore 보안 규칙**: 사용자별 데이터 접근 제어
- **Storage 보안 규칙**: 사용자별 파일 접근 제어
- **CORS 설정**: 허용된 도메인만 API 접근
- **환경 변수**: 민감한 정보 분리 관리

---

## 🔄 개발 로그

### 2025-12-07
- ✅ 미니멀 UI/UX 디자인 적용 (Teal & Lavender 팔레트)
- ✅ Pretendard 폰트 적용
- ✅ 헤더 전체 음성 파형 애니메이션
- ✅ 사이드바 호버 효과 추가
- ✅ 파일 업로드 영역 파형 애니메이션
- ✅ 카테고리별 카드 디자인 통일

### 2025-12-06
- ✅ 아이디어 완료 시 AI 의견도 함께 완료 처리
- ✅ Google Calendar 연동 (약속 일정)
- ✅ 자연어 날짜/시간/장소 파싱

### 2025-12-05
- ✅ Gemini AI 프롬프트 강화 (summary_list 필수화)
- ✅ 카테고리별 체크박스/장바구니 기능
- ✅ 완료 필터 기능
- ✅ Frontend 정적 export 전환
- ✅ Cloud Run API 서버 배포

### 2025-12-04
- ✅ Google AI Studio API 통합
- ✅ 자동 카테고리 분류 시스템
- ✅ 실시간 Firestore 동기화
- ✅ PWA 지원

---

## 🐛 문제 해결

### 일반적인 이슈

| 문제 | 해결 방법 |
|------|----------|
| 서버 연결 오류 | Cloud Run 서비스 상태 확인 |
| 음성 인식 실패 | 오디오 포맷 및 마이크 권한 확인 |
| API 키 오류 | 환경 변수 설정 확인 |
| 빌드 에러 | `pnpm install` 재실행 |
| 캘린더 연동 안됨 | 팝업 차단 해제 확인 |

### 서버 상태 확인
```bash
curl https://voice-organizer-server-565683939264.asia-northeast1.run.app/health
```

---

## 📄 라이선스

MIT License

---

## 🤝 기여

이슈와 풀 리퀘스트를 환영합니다!

**GitHub**: https://github.com/jinseo0709/voice_Organizer

---

**🎙️ Voice Organizer V2** - AI 기반 스마트 음성 메모 관리 시스템

*Teal & Lavender 미니멀 디자인 | Pretendard 폰트 | 음성 파형 애니메이션*
