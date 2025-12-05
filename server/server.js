require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { SpeechClient } = require('@google-cloud/speech');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
      projectId: process.env.FIREBASE_PROJECT_ID || 'voice-organizer-480015',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'voice-organizer-480015.firebasestorage.app'
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
    const thresholdKB = parseInt(process.env.AUDIO_SIZE_THRESHOLD_KB) || 500;
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

// 오디오 형식 감지
function detectAudioFormat(buffer) {
  const header = buffer.slice(0, 12).toString('hex');
  const headerStr = buffer.slice(0, 12).toString('ascii');

  console.log('🔍 오디오 헤더 분석:', { hex: header, ascii: headerStr });

  // WebM 형식: 1A 45 DF A3 (EBML header)
  if (header.startsWith('1a45dfa3')) {
    return 'WEBM_OPUS';
  }

  // OGG 형식: OggS
  if (headerStr.startsWith('OggS')) {
    return 'OGG_OPUS';
  }

  // M4A/MP4 형식: ftyp (FFmpeg 변환 필요)
  if (header.includes('66747970') || headerStr.includes('ftyp')) {
    return 'M4A'; // M4A는 별도 변환 필요
  }

  // WAV 형식: RIFF
  if (headerStr.startsWith('RIFF')) {
    return 'LINEAR16';
  }

  // MP3 형식: ID3 또는 FF FB
  if (headerStr.startsWith('ID3') || header.startsWith('fffb') || header.startsWith('fff3')) {
    return 'MP3';
  }

  // FLAC 형식: fLaC
  if (headerStr.startsWith('fLaC')) {
    return 'FLAC';
  }

  return null; // 알 수 없는 형식
}

// M4A를 WAV로 변환 (FFmpeg 사용)
async function convertM4AtoWAV(inputBuffer) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input-${Date.now()}.m4a`);
    const outputPath = path.join(tempDir, `output-${Date.now()}.wav`);

    console.log('🔄 M4A → WAV 변환 시작...');
    console.log('📁 임시 파일:', { inputPath, outputPath });

    // 입력 파일 저장
    fs.writeFileSync(inputPath, inputBuffer);

    ffmpeg(inputPath)
      .toFormat('wav')
      .audioCodec('pcm_s16le')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('start', (commandLine) => {
        console.log('🎬 FFmpeg 명령:', commandLine);
      })
      .on('progress', (progress) => {
        console.log('⏳ 변환 진행중:', progress.percent ? `${progress.percent.toFixed(1)}%` : 'processing...');
      })
      .on('end', () => {
        console.log('✅ M4A → WAV 변환 완료');

        // 출력 파일 읽기
        const outputBuffer = fs.readFileSync(outputPath);

        // 임시 파일 정리
        try {
          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
          console.log('🗑️ 임시 파일 정리 완료');
        } catch (cleanupError) {
          console.warn('⚠️ 임시 파일 정리 실패:', cleanupError.message);
        }

        resolve(outputBuffer);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg 변환 오류:', err.message);

        // 임시 파일 정리
        try {
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (cleanupError) {
          console.warn('⚠️ 임시 파일 정리 실패:', cleanupError.message);
        }

        reject(new Error(`오디오 변환 실패: ${err.message}`));
      })
      .save(outputPath);
  });
}

// 짧은 오디오 처리 (500KB 미만)
async function transcribeShortAudio(audioBuffer, options = {}) {
  const {
    languageCode = process.env.SPEECH_API_LANGUAGE || 'ko-KR',
    enableAutomaticPunctuation = true,
    model = 'default'
  } = options;

  // 오디오 형식 감지
  const detectedFormat = detectAudioFormat(audioBuffer);
  console.log('🎵 감지된 오디오 형식:', detectedFormat);

  // M4A 형식이면 WAV로 변환
  let processedBuffer = audioBuffer;
  let finalEncoding = detectedFormat;

  if (detectedFormat === 'M4A') {
    console.log('🔄 M4A 형식 감지 - WAV로 변환 필요');
    try {
      processedBuffer = await convertM4AtoWAV(audioBuffer);
      finalEncoding = 'LINEAR16';
      console.log('✅ WAV 변환 완료, 버퍼 크기:', processedBuffer.length);
    } catch (convertError) {
      console.error('❌ M4A 변환 실패:', convertError.message);
      throw new Error(`M4A 파일 변환 실패: ${convertError.message}`);
    }
  }

  const audioContent = processedBuffer.toString('base64');

  // 감지된 형식에 따라 인코딩 설정
  let encodingConfigs;

  if (finalEncoding === 'LINEAR16') {
    // 변환된 WAV 또는 원본 WAV
    encodingConfigs = [
      { encoding: 'LINEAR16', sampleRateHertz: 16000 },
    ];
  } else if (finalEncoding === 'MP3') {
    encodingConfigs = [
      { encoding: 'MP3', sampleRateHertz: 48000 },
      { encoding: 'MP3', sampleRateHertz: 44100 },
      { encoding: 'MP3', sampleRateHertz: 16000 },
    ];
  } else if (finalEncoding === 'FLAC') {
    encodingConfigs = [
      { encoding: 'FLAC', sampleRateHertz: 48000 },
      { encoding: 'FLAC', sampleRateHertz: 44100 },
      { encoding: 'FLAC', sampleRateHertz: 16000 },
    ];
  } else {
    // WebM 또는 OGG (기본값)
    encodingConfigs = [
      { encoding: 'WEBM_OPUS', sampleRateHertz: 48000 },
      { encoding: 'OGG_OPUS', sampleRateHertz: 48000 },
    ];
  }

  let lastError = null;

  for (const config of encodingConfigs) {
    const request = {
      config: {
        encoding: config.encoding,
        sampleRateHertz: config.sampleRateHertz,
        languageCode: languageCode,
        enableAutomaticPunctuation: enableAutomaticPunctuation,
        model: model,
        audioChannelCount: 1,
      },
      audio: {
        content: audioContent,
      },
    };

    console.log(`📡 GCP Speech-to-Text 호출 시도: ${config.encoding} @ ${config.sampleRateHertz}Hz`);

    try {
      const [response] = await speechClient.recognize(request);

      // 결과가 있는지 확인
      if (response && response.results && response.results.length > 0) {
        console.log(`✅ 성공: ${config.encoding} @ ${config.sampleRateHertz}Hz`);
        console.log('📥 GCP 응답:', JSON.stringify(response, null, 2));
        return parseRecognitionResult(response);
      } else {
        console.log(`⚠️ ${config.encoding} @ ${config.sampleRateHertz}Hz: 결과 없음, 다음 시도...`);
        lastError = new Error('음성 인식 결과가 없습니다.');
      }
    } catch (error) {
      console.error(`❌ ${config.encoding} @ ${config.sampleRateHertz}Hz 실패:`, error.message);
      lastError = error;
    }
  }

  // 모든 시도 실패
  throw lastError || new Error('모든 인코딩 시도가 실패했습니다.');
}

// 긴 오디오 처리 (500KB 이상) - Firebase Storage 사용
async function transcribeLongAudio(audioBuffer, options = {}) {
  const {
    languageCode = process.env.SPEECH_API_LANGUAGE || 'ko-KR',
    enableAutomaticPunctuation = true,
    model = process.env.SPEECH_API_MODEL_LONG || 'latest_long'
  } = options;

  // 오디오 형식 감지 및 M4A 변환
  const detectedFormat = detectAudioFormat(audioBuffer);
  console.log('🎵 감지된 오디오 형식 (Long):', detectedFormat);

  let processedBuffer = audioBuffer;
  let finalEncoding = 'WEBM_OPUS';
  let sampleRateHertz = 48000;
  let contentType = 'audio/webm';
  let fileExtension = 'webm';

  if (detectedFormat === 'M4A') {
    console.log('🔄 M4A 형식 감지 (Long) - WAV로 변환 필요');
    try {
      processedBuffer = await convertM4AtoWAV(audioBuffer);
      finalEncoding = 'LINEAR16';
      sampleRateHertz = 16000;
      contentType = 'audio/wav';
      fileExtension = 'wav';
      console.log('✅ WAV 변환 완료 (Long), 버퍼 크기:', processedBuffer.length);
    } catch (convertError) {
      console.error('❌ M4A 변환 실패 (Long):', convertError.message);
      throw new Error(`M4A 파일 변환 실패: ${convertError.message}`);
    }
  } else if (detectedFormat === 'LINEAR16') {
    finalEncoding = 'LINEAR16';
    sampleRateHertz = 16000;
    contentType = 'audio/wav';
    fileExtension = 'wav';
  } else if (detectedFormat === 'MP3') {
    finalEncoding = 'MP3';
    sampleRateHertz = 44100;
    contentType = 'audio/mpeg';
    fileExtension = 'mp3';
  }

  // Firebase Storage에 임시 파일 업로드
  const tempFileName = `temp-audio-${Date.now()}.${fileExtension}`;
  const bucket = admin.storage().bucket();
  const file = bucket.file(`temp-audio/${tempFileName}`);

  console.log('📁 Firebase Storage에 오디오 업로드 중...');
  await file.save(processedBuffer, {
    metadata: {
      contentType: contentType,
    },
  });

  const gcsUri = `gs://voice-organizer-480015.firebasestorage.app/temp-audio/${tempFileName}`;
  console.log('📡 업로드 완료:', gcsUri);

  const request = {
    config: {
      encoding: finalEncoding,
      sampleRateHertz: sampleRateHertz,
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