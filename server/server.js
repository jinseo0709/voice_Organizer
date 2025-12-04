require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 8080;

// 환경 변수 검증
if (!process.env.GOOGLE_CLOUD_PROJECT) {
  console.warn('⚠️  GOOGLE_CLOUD_PROJECT 환경 변수가 설정되지 않았습니다.');
}
if (!process.env.FIREBASE_PROJECT_ID) {
  console.warn('⚠️  FIREBASE_PROJECT_ID 환경 변수가 설정되지 않았습니다.');
}

// CORS 설정 - 환경 변수에서 허용 도메인 로드 (모든 클라이언트 허용)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'https://voice-organizer-app.web.app',
      'https://voice-organizer-app.firebaseapp.com',
      '*' // 모든 도메인 허용
    ];

app.use(cors({
  origin: function (origin, callback) {
    // 모든 출처 허용 (개발 환경)
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));

// Multer 설정 (메모리 저장)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB 제한
});

// GCP 클라이언트 초기화
let speechClient;
let storage;

try {
  const gcpConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'voice-organizer-480015'
  };
  
  // 서비스 계정 키 파일이 있는 경우 명시적으로 설정
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    gcpConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  
  speechClient = new SpeechClient(gcpConfig);
  storage = new Storage(gcpConfig);
  
  console.log('✅ GCP 클라이언트 초기화 완료 - 프로젝트:', gcpConfig.projectId);
} catch (error) {
  console.error('❌ GCP 클라이언트 초기화 실패:', error);
}

// Firebase Admin 초기화
try {
  if (!admin.apps.length) {
    const firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'voice-organizer-app',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'voice-organizer-app.firebasestorage.app'
    };
    
    // 서비스 계정 키가 설정된 경우 credential 추가
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseConfig.credential = admin.credential.applicationDefault();
    }
    
    admin.initializeApp(firebaseConfig);
  }
  console.log('✅ Firebase Admin 초기화 완료 - 프로젝트:', process.env.FIREBASE_PROJECT_ID || 'voice-organizer-app');
} catch (error) {
  console.error('❌ Firebase Admin 초기화 실패:', error);
}

// 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'voice-organizer-server'
  });
});

// Speech-to-Text API 엔드포인트
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  try {
    console.log('🎤 GCP 음성 인식 요청 시작...');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: '오디오 파일이 필요합니다.' 
      });
    }

    const audioBuffer = req.file.buffer;
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
    console.log('📊 오디오 분석:', {
      fileName: req.file.originalname,
      fileSize: audioBuffer.length,
      audioSizeKB: Math.round(audioBuffer.length / 1024),
      options
    });

    // 파일 크기 기반 메소드 선택 (환경 변수에서 임계값 로드)
    const audioSizeKB = audioBuffer.length / 1024;
    const thresholdKB = parseInt(process.env.AUDIO_SIZE_THRESHOLD_KB) || 300;
    const isLongAudio = audioSizeKB > thresholdKB;
    
    console.log(`🔀 ${isLongAudio ? 'LongRunningRecognize' : 'Recognize'} 방식 사용 (${audioSizeKB.toFixed(0)}KB)`);

    let result;
    if (isLongAudio) {
      result = await transcribeLongAudio(audioBuffer, options);
    } else {
      result = await transcribeShortAudio(audioBuffer, options);
    }

    console.log('✅ 음성 인식 완료:', {
      transcript: result.transcript.substring(0, 100) + (result.transcript.length > 100 ? '...' : ''),
      confidence: result.confidence
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('❌ 음성 인식 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message || '음성 인식 중 오류가 발생했습니다.'
    });
  }
});

// 짧은 오디오 처리 (300KB 미만)
async function transcribeShortAudio(audioBuffer, options = {}) {
  const {
    languageCode = process.env.SPEECH_API_LANGUAGE || 'ko-KR',
    encoding = 'WEBM_OPUS',
    enableAutomaticPunctuation = true,
    model = process.env.SPEECH_API_MODEL_SHORT || 'latest_short'
  } = options;

  const request = {
    config: {
      encoding: encoding,
      languageCode: languageCode,
      enableAutomaticPunctuation: enableAutomaticPunctuation,
      model: model,
      audioChannelCount: 1,
      useEnhanced: true,
    },
    audio: {
      content: audioBuffer.toString('base64'),
    },
  };

  console.log('📡 GCP Speech-to-Text (SHORT) API 호출...');
  const [response] = await speechClient.recognize(request);
  
  return parseRecognitionResult(response);
}

// 긴 오디오 처리 (300KB 이상) - Firebase Storage 사용
async function transcribeLongAudio(audioBuffer, options = {}) {
  const {
    languageCode = process.env.SPEECH_API_LANGUAGE || 'ko-KR',
    encoding = 'WEBM_OPUS',
    enableAutomaticPunctuation = true,
    model = process.env.SPEECH_API_MODEL_LONG || 'latest_long'
  } = options;

  // Firebase Storage에 임시 파일 업로드
  const tempFileName = `temp-audio-${Date.now()}.webm`;
  const bucket = admin.storage().bucket();
  const file = bucket.file(`temp-audio/${tempFileName}`);

  console.log('📁 Firebase Storage에 오디오 업로드 중...');
  await file.save(audioBuffer, {
    metadata: {
      contentType: 'audio/webm',
    },
  });

  const gcsUri = `gs://voice-organizer-app.firebasestorage.app/temp-audio/${tempFileName}`;
  console.log('📡 업로드 완료:', gcsUri);

  const request = {
    config: {
      encoding: encoding,
      languageCode: languageCode,
      enableAutomaticPunctuation: enableAutomaticPunctuation,
      model: model,
      audioChannelCount: 1,
      useEnhanced: true,
    },
    audio: {
      uri: gcsUri,
    },
  };

  console.log('📡 GCP Speech-to-Text (LONG) API 호출...');
  const [operation] = await speechClient.longRunningRecognize(request);
  console.log('⏳ 긴 오디오 인식 진행 중...');
  
  const [response] = await operation.promise();
  
  // 임시 파일 삭제
  try {
    await file.delete();
    console.log('🗑️ 임시 파일 삭제 완료');
  } catch (deleteError) {
    console.warn('⚠️ 임시 파일 삭제 실패:', deleteError.message);
  }

  return parseRecognitionResult(response);
}

// 공통 결과 파싱
function parseRecognitionResult(response) {
  console.log('🔍 응답 파싱 중...');
  
  if (!response || !response.results || response.results.length === 0) {
    console.error('❌ 빈 응답:', JSON.stringify(response, null, 2));
    throw new Error('음성 인식 결과가 없습니다. 오디오에 명확한 음성이 포함되어 있는지 확인해주세요.');
  }

  const result = response.results[0];
  if (!result.alternatives || result.alternatives.length === 0) {
    throw new Error('음성 인식 대안 결과가 없습니다.');
  }

  const alternative = result.alternatives[0];
  if (!alternative.transcript) {
    throw new Error('음성 인식 텍스트가 없습니다. 오디오 품질을 확인해주세요.');
  }

  console.log('✅ 파싱 완료:', alternative.transcript);

  return {
    transcript: alternative.transcript,
    confidence: alternative.confidence || 0,
    alternatives: result.alternatives.map(alt => ({
      transcript: alt.transcript || '',
      confidence: alt.confidence || 0
    }))
  };
}

// 에러 핸들링
app.use((error, req, res, next) => {
  console.error('서버 오류:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Voice Organizer 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`📍 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🎤 Speech API: http://localhost:${PORT}/api/speech-to-text`);
});

// graceful shutdown
process.on('SIGTERM', () => {
  console.log('서버 종료 중...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('서버 종료 중...');
  process.exit(0);
});