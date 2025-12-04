# Voice Organizer - GCP Cloud Run Server

GCP Cloud Run에 배포되는 Voice Organizer 음성 인식 서버입니다.

## 기능

- GCP Speech-to-Text API 통합
- 자동 오디오 길이 감지 (300KB 기준)
- Firebase Storage 연동 (긴 오디오용)
- CORS 지원
- 헬스체크 엔드포인트

## API 엔드포인트

### POST /api/speech-to-text
음성을 텍스트로 변환합니다.

**요청:**
- Content-Type: multipart/form-data
- audio: 오디오 파일 (WEBM, MP3, WAV 지원)
- options: JSON 문자열 (선택사항)

**응답:**
```json
{
  "success": true,
  "transcript": "변환된 텍스트",
  "confidence": 0.95,
  "alternatives": []
}
```

### GET /health
서버 상태를 확인합니다.

## 로컬 개발

```bash
npm install
npm start
```

## 배포

```bash
# 1. Docker 이미지 빌드
docker build -t voice-organizer-server .

# 2. GCP에 이미지 푸시
docker tag voice-organizer-server gcr.io/voice-organizer-480015/voice-organizer-server
docker push gcr.io/voice-organizer-480015/voice-organizer-server

# 3. Cloud Run에 배포
gcloud run deploy voice-organizer-server \
  --image gcr.io/voice-organizer-480015/voice-organizer-server \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=voice-organizer-480015
```

## 환경 변수

- `PORT`: 서버 포트 (기본값: 8080)
- `GOOGLE_CLOUD_PROJECT`: GCP 프로젝트 ID (기본값: voice-organizer-480015)