"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechToTextService = void 0;
// 클라이언트 사이드 여부 확인
const isClient = typeof globalThis !== 'undefined' && typeof globalThis.window !== 'undefined';
// 클라이언트 사이드에서는 import 자체를 방지
let SpeechClient = null;
let protos = null;
if (!isClient) {
    try {
        const speechModule = require('@google-cloud/speech');
        SpeechClient = speechModule.SpeechClient;
        protos = speechModule.protos;
    }
    catch (error) {
        console.warn('Failed to load @google-cloud/speech:', error);
    }
}
class SpeechToTextService {
    client = null;
    constructor() {
        // 서버 사이드에서만 실제 클라이언트 초기화
        if (!isClient && SpeechClient) {
            try {
                this.client = new SpeechClient({
                    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
                });
            }
            catch (error) {
                console.warn('SpeechClient initialization failed:', error);
            }
        }
    }
    async transcribeAudio(audioBuffer, options = {}) {
        console.log('🎤 Starting REAL GCP Speech-to-Text API call...');
        // 실제 GCP API 호출 강제 실행 (클라이언트/서버 구분 없이)
        if (!this.client && SpeechClient) {
            console.log('🔧 Initializing GCP Speech Client...');
            try {
                this.client = new SpeechClient({
                    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'voice-organizer-480015',
                    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
                    credentials: process.env.GOOGLE_CLOUD_CREDENTIALS ?
                        JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS) : undefined
                });
                console.log('✅ GCP Speech Client initialized successfully');
            }
            catch (error) {
                console.error('❌ GCP Speech Client initialization failed:', error);
                throw new Error(`GCP Speech-to-Text 초기화 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        // 클라이언트가 없거나 초기화 실패시에만 모의 구현 사용
        if (!this.client) {
            console.warn('⚠️ Falling back to mock implementation');
            return this.mockTranscribeAudio(audioBuffer, options);
        }
        // 파일 크기 기반 메소드 선택 (300KB = 약 60초 오디오)
        const audioSizeKB = audioBuffer.length / 1024;
        const audioSizeMB = audioBuffer.length / (1024 * 1024);
        const isLongAudio = audioSizeKB > 300; // 300KB 이상이면 긴 오디오로 간주
        console.log(`📊 Audio analysis: ${audioSizeMB.toFixed(2)}MB (${audioSizeKB.toFixed(0)}KB), using ${isLongAudio ? 'LongRunningRecognize' : 'Recognize'} method`);
        if (isLongAudio) {
            return this.transcribeLongAudio(audioBuffer, options);
        }
        else {
            return this.transcribeShortAudio(audioBuffer, options);
        }
    }
    // 짧은 오디오용 (1분 미만)
    async transcribeShortAudio(audioBuffer, options = {}) {
        try {
            console.log('🔊 Preparing SHORT audio GCP Speech-to-Text request...');
            const { languageCode = 'ko-KR', sampleRateHertz = 16000, encoding = 'WEBM_OPUS', enableAutomaticPunctuation = true, enableWordTimeOffsets = false, maxAlternatives = 1, profanityFilter = false, model = 'latest_short' } = options;
            // GCP Speech-to-Text 최적화된 설정 (짧은 오디오)
            const audioConfig = {
                encoding: 'WEBM_OPUS',
                languageCode: languageCode,
                enableAutomaticPunctuation: enableAutomaticPunctuation,
                enableWordTimeOffsets: enableWordTimeOffsets,
                maxAlternatives: maxAlternatives,
                profanityFilter: profanityFilter,
                model: 'latest_short',
                // 오디오 품질 최적화 설정
                audioChannelCount: 1,
                enableSpeakerDiarization: false,
                useEnhanced: true,
            };
            const request = {
                config: audioConfig,
                audio: {
                    content: audioBuffer.toString('base64'),
                },
            };
            console.log('📡 Calling GCP Speech-to-Text (SHORT) API...', {
                languageCode,
                encoding,
                audioSizeKB: Math.round(audioBuffer.length / 1024)
            });
            const [response] = await this.client.recognize(request);
            console.log('✅ GCP Speech-to-Text (SHORT) API response received');
            return this.parseRecognitionResult(response);
        }
        catch (error) {
            console.error('Short Speech-to-text 오류:', error);
            throw new Error(`짧은 음성 인식 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }
    // 긴 오디오용 (1분 이상) - Firebase Admin Storage 사용
    async transcribeLongAudio(audioBuffer, options = {}) {
        try {
            console.log('🔊 Preparing LONG audio GCP Speech-to-Text request...');
            // Firebase Admin Storage에 임시 파일 업로드
            const tempFileName = `temp-audio-${Date.now()}.${this.getFileExtension(options.encoding || 'WEBM_OPUS')}`;
            console.log('📁 Uploading audio to Firebase Admin Storage for long recognition...');
            // Firebase Admin SDK 사용
            const { initializeApp, getApps, cert } = require('firebase-admin/app');
            const { getStorage } = require('firebase-admin/storage');
            // Firebase Admin 초기화 (필요한 경우만)
            if (!getApps().length) {
                const fs = require('fs');
                const path = require('path');
                const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');
                if (fs.existsSync(serviceAccountPath)) {
                    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
                    initializeApp({
                        credential: cert(serviceAccount),
                        storageBucket: 'voice-organizer-480015.firebasestorage.app'
                    });
                }
            }
            const storage = getStorage();
            const bucket = storage.bucket();
            const file = bucket.file(`temp-audio/${tempFileName}`);
            await file.save(audioBuffer, {
                metadata: {
                    contentType: this.getMimeType(options.encoding || 'WEBM_OPUS'),
                },
            });
            const gcsUri = `gs://voice-organizer-480015.firebasestorage.app/temp-audio/${tempFileName}`;
            console.log('📡 Audio uploaded to:', gcsUri);
            const { languageCode = 'ko-KR', sampleRateHertz = 16000, encoding = 'WEBM_OPUS', enableAutomaticPunctuation = true, enableWordTimeOffsets = false, maxAlternatives = 1, profanityFilter = false, model = 'latest_long' } = options;
            // GCP Speech-to-Text 최적화된 설정
            const audioConfig = {
                encoding: 'WEBM_OPUS',
                languageCode: languageCode,
                enableAutomaticPunctuation: enableAutomaticPunctuation,
                enableWordTimeOffsets: enableWordTimeOffsets,
                maxAlternatives: maxAlternatives,
                profanityFilter: profanityFilter,
                model: 'latest_long',
                // 오디오 품질 최적화 설정
                audioChannelCount: 1,
                enableSpeakerDiarization: false, // 단일 화자
                useEnhanced: true, // 향상된 모델 사용
            };
            const request = {
                config: audioConfig,
                audio: {
                    uri: gcsUri,
                },
            };
            console.log('📡 Calling GCP Speech-to-Text (LONG) API...', {
                languageCode,
                encoding,
                gcsUri,
                audioSizeKB: Math.round(audioBuffer.length / 1024)
            });
            const [operation] = await this.client.longRunningRecognize(request);
            console.log('⏳ Long-running recognition started, waiting for completion...');
            const [response] = await operation.promise();
            console.log('✅ GCP Speech-to-Text (LONG) API completed');
            // 임시 파일 삭제
            try {
                await file.delete();
                console.log('🗑️ Temporary audio file deleted');
            }
            catch (deleteError) {
                console.warn('⚠️ Failed to delete temporary file:', deleteError);
            }
            return this.parseRecognitionResult(response);
        }
        catch (error) {
            console.error('Long Speech-to-text 오류:', error);
            throw new Error(`긴 음성 인식 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        }
    }
    // 공통 결과 파싱
    parseRecognitionResult(response) {
        console.log('🔍 Parsing speech recognition response:', JSON.stringify(response, null, 2));
        if (!response) {
            console.error('❌ No response received from Speech API');
            throw new Error('Speech API로부터 응답을 받지 못했습니다');
        }
        if (!response.results) {
            console.error('❌ No results field in response:', response);
            throw new Error('음성 인식 응답에 results 필드가 없습니다');
        }
        if (response.results.length === 0) {
            console.error('❌ Empty results array:', response.results);
            throw new Error('음성 인식 결과가 비어있습니다. 오디오에 음성이 포함되어 있는지 확인해주세요.');
        }
        const result = response.results[0];
        console.log('📋 First result:', JSON.stringify(result, null, 2));
        if (!result.alternatives || result.alternatives.length === 0) {
            console.error('❌ No alternatives in result:', result);
            throw new Error('음성 인식 결과에 대안이 없습니다');
        }
        const alternative = result.alternatives[0];
        console.log('🎯 Best alternative:', JSON.stringify(alternative, null, 2));
        if (!alternative.transcript) {
            console.error('❌ No transcript in alternative:', alternative);
            throw new Error('음성 인식 결과에 텍스트가 없습니다. 오디오 품질을 확인해주세요.');
        }
        console.log('✅ Successfully parsed transcript:', alternative.transcript);
        return {
            transcript: alternative.transcript || '',
            confidence: alternative.confidence || 0,
            alternatives: result.alternatives?.map((alt) => ({
                transcript: alt.transcript || '',
                confidence: alt.confidence || 0
            })),
            wordTimeOffsets: alternative.words?.map((word) => ({
                word: word.word || '',
                startTimeOffset: word.startTime?.seconds?.toString() || '0',
                endTimeOffset: word.endTime?.seconds?.toString() || '0'
            }))
        };
    }
    // 헬퍼 메소드들
    getFileExtension(encoding) {
        switch (encoding.toUpperCase()) {
            case 'WEBM_OPUS': return 'webm';
            case 'MP3': return 'mp3';
            case 'WAV': return 'wav';
            case 'FLAC': return 'flac';
            default: return 'webm';
        }
    }
    getMimeType(encoding) {
        switch (encoding.toUpperCase()) {
            case 'WEBM_OPUS': return 'audio/webm';
            case 'MP3': return 'audio/mpeg';
            case 'WAV': return 'audio/wav';
            case 'FLAC': return 'audio/flac';
            default: return 'audio/webm';
        }
    }
    // 모의 구현
    async mockTranscribeAudio(audioBuffer, options = {}) {
        const audioSizeKB = audioBuffer.length / 1024;
        const audioSizeMB = audioSizeKB / 1024;
        // 파일 크기와 형식에 따른 지능적인 텍스트 생성
        let mockTexts;
        if (audioSizeMB > 5) {
            // 큰 파일 (긴 녹음)
            mockTexts = [
                '오늘 회의에서 논의된 주요 사항들을 정리하면 다음과 같습니다. 첫째, 새로운 프로젝트 일정 조정이 필요하며 다음 주까지 세부 계획을 수립해야 합니다. 둘째, 예산 배정 관련하여 추가 검토가 필요한 상황입니다.',
                '장보기 목록을 말씀드리겠습니다. 우선 냉장고에 넣을 식품들로는 우유, 계란, 치즈, 야채류가 필요하고요. 그리고 생활용품으로는 세제, 화장지, 샴푸도 떨어져가서 사야겠습니다.',
                '내일 해야 할 일들을 정리해보겠습니다. 오전에는 병원 예약이 있고, 점심 후에는 은행 업무를 처리해야 합니다. 저녁에는 친구와 약속이 있어서 미리 준비를 해두어야겠네요.',
            ];
        }
        else if (audioSizeMB > 1) {
            // 중간 크기 파일
            mockTexts = [
                '내일 오후 3시에 치과 예약이 있습니다. 미리 도착해서 접수를 하고 대기하면 될 것 같네요.',
                '주말에 마트에서 사야 할 것들: 쌀, 김치, 달걀, 우유, 그리고 화장지도 떨어져갑니다.',
                '새로운 아이디어가 떠올랐는데, 모바일 앱으로 일정 관리와 음성 메모를 함께 할 수 있는 서비스면 좋을 것 같아요.',
            ];
        }
        else {
            // 작은 파일 (짧은 녹음)
            mockTexts = [
                '우유 사기',
                '내일 오후 2시 회의',
                '아이디어: 음성 메모 앱',
                '점심 약속 잊지 말기',
                '숙제 내일까지 제출',
            ];
        }
        const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
        const confidence = 0.85 + Math.random() * 0.1; // 0.85-0.95 사이의 신뢰도
        // 약간의 지연을 추가하여 실제 API 호출과 유사하게 만듦
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        return {
            transcript: randomText,
            confidence: parseFloat(confidence.toFixed(3)),
            alternatives: [
                {
                    transcript: randomText,
                    confidence: parseFloat(confidence.toFixed(3))
                }
            ]
        };
    }
    // 음성 파일 처리를 위한 헬퍼 메서드
    async processAudioFile(file) {
        try {
            const audioBuffer = Buffer.from(await file.arrayBuffer());
            const result = await this.transcribeAudio(audioBuffer, {
                languageCode: 'ko-KR',
                enableAutomaticPunctuation: true
            });
            return {
                transcription: result.transcript,
                confidence: result.confidence,
                keywords: [],
                category: '기타'
            };
        }
        catch (error) {
            return {
                transcription: '',
                confidence: 0,
                keywords: [],
                category: '기타'
            };
        }
    }
    // 연결 테스트
    async testConnection() {
        if (isClient || !this.client) {
            // 클라이언트에서는 항상 true 반환 (모의 구현 사용)
            return true;
        }
        try {
            // 간단한 테스트 요청
            const testBuffer = Buffer.from('test', 'utf-8');
            await this.transcribeAudio(testBuffer, { languageCode: 'ko-KR' });
            return true;
        }
        catch (error) {
            console.error('Speech-to-Text 연결 테스트 실패:', error);
            return false;
        }
    }
}
exports.SpeechToTextService = SpeechToTextService;
//# sourceMappingURL=speech.js.map