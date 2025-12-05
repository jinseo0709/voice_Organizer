'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioFileUpload } from './AudioFileUpload';
import { ProcessingStatus } from './ProcessingStatus';
import { ProcessingResults } from './ProcessingResults';
import { Mic, Upload, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UploadResult } from '@voice-organizer/firebase';

// Firebase 초기화 강제 실행
import '@/lib/firebase';

// Cloud Run API 서버 URL (정적 export에서는 환경 변수 사용 불가하므로 직접 설정)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://voice-organizer-server-565683939264.asia-northeast1.run.app';

// 처리 단계 정의
export type ProcessingStep = 
  | 'upload' 
  | 'speech-to-text' 
  | 'text-analysis' 
  | 'category-classification' 
  | 'summary-generation'
  | 'saving'
  | 'completed';

// 처리 결과 인터페이스
export interface VoiceProcessingResult {
  id: string;
  originalText: string;
  category: string;
  categoryConfidence: number;
  summary: string;
  entities: Array<{
    name: string;
    type: string;
    salience: number;
  }>;
  sentiment: {
    score: number;
    magnitude: number;
  };
  keywords: string[];
  audioUrl: string;
  processingTime: number;
  createdAt: Date;
}

interface VoiceProcessorProps {
  onProcessingComplete: (result: VoiceProcessingResult) => void;
  onError: (error: string) => void;
}

export function VoiceProcessor({ onProcessingComplete, onError }: VoiceProcessorProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<ProcessingStep>('upload');
  const [processing, setProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VoiceProcessingResult | null>(null);

  // 파일 업로드 완료 핸들러
  const handleUploadComplete = async (uploadResult: UploadResult) => {
    if (!user) {
      onError('사용자 인증이 필요합니다.');
      return;
    }

    setUploadResult(uploadResult);
    setProcessing(true);
    setError(null);
    
    try {
      // 전체 처리 플로우 시작
      await processAudioFile(uploadResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.';
      setError(errorMessage);
      onError(errorMessage);
      setProcessing(false);
    }
  };

  // 오디오 파일 전체 처리 플로우
  const processAudioFile = async (uploadResult: UploadResult) => {
    const startTime = Date.now();
    
    try {
      // 1단계: 음성-텍스트 변환
      setCurrentStep('speech-to-text');
      const transcription = await performSpeechToText(uploadResult);
      
      // 2단계: 텍스트 분석
      setCurrentStep('text-analysis');
      const analysis = await performTextAnalysis(transcription);
      
      // 3단계: 카테고리 분류
      setCurrentStep('category-classification');
      const category = await performCategoryClassification(analysis);
      
      // 4단계: 카테고리별 맞춤형 요약 생성
      setCurrentStep('summary-generation');
      const summary = await generateCategorizedSummary(transcription, category.name);
      
      // 5단계: Firestore에 저장
      setCurrentStep('saving');
      const voiceResult = await saveVoiceProcessingResult({
        originalText: transcription,
        category: category.name,
        categoryConfidence: category.confidence,
        summary,
        entities: analysis.entities,
        sentiment: analysis.sentiment,
        keywords: analysis.keywords,
        audioUrl: uploadResult.downloadURL,
        processingTime: Date.now() - startTime
      });
      
      // 6단계: 완료
      setCurrentStep('completed');
      setResult(voiceResult);
      setProcessing(false);
      onProcessingComplete(voiceResult);
      
    } catch (error) {
      throw error;
    }
  };

  // 음성-텍스트 변환 (서버 API 호출)
  const performSpeechToText = async (uploadResult: UploadResult): Promise<string> => {
    try {
      console.log('🎤 Starting REAL Speech-to-Text via server API...');
      
      // Firebase Storage에서 파일 다운로드
      const response = await fetch(uploadResult.downloadURL);
      if (!response.ok) {
        throw new Error(`파일 다운로드 실패: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      
      // 서버 API 호출용 FormData 생성
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('options', JSON.stringify({
        languageCode: 'ko-KR',
        enableAutomaticPunctuation: true,
        model: 'latest_long'
      }));
      
      console.log('📡 Calling Speech-to-Text API via proxy...', {
        audioFileName: 'audio-file',
        audioSize: audioBlob.size,
        audioType: audioBlob.type
      });
      
      // Cloud Run 서버로 직접 API 호출
      const apiResponse = await fetch(`${API_BASE_URL}/api/speech-to-text`, {
        method: 'POST',
        body: formData,
        // 타임아웃 설정은 브라우저에서 자동 처리됨
      });
      
      console.log('📨 API 응답 상태:', apiResponse.status, apiResponse.statusText);
      
      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error('❌ API 응답 오류:', errorText);
        throw new Error(`API 응답 오류 (${apiResponse.status}): ${errorText}`);
      }
      
      const apiResult = await apiResponse.json();
      
      console.log('📋 API 결과:', {
        success: apiResult.success,
        hasTranscript: !!apiResult.transcript,
        error: apiResult.error
      });
      
      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Server API 호출 실패');
      }
      
      console.log('✅ Speech-to-Text completed via proxy:', {
        transcript: apiResult.transcript ? apiResult.transcript.substring(0, 100) + '...' : 'NO_TRANSCRIPT',
        confidence: apiResult.confidence
      });
      
      if (!apiResult.transcript || apiResult.transcript.trim() === '') {
        throw new Error('음성 인식 결과가 없습니다. 오디오에 명확한 음성이 포함되어 있는지 확인해주세요.');
      }
      
      return apiResult.transcript;
      
    } catch (error) {
      console.error('❌ Real Speech-to-Text failed:', error);
      throw new Error(`음성 인식 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 텍스트 분석 (Gemini AI 서버 API 사용)
  const performTextAnalysis = async (text: string) => {
    try {
      console.log('🤖 Starting Gemini AI text analysis via server API...');
      
      // Cloud Run 서버를 통한 Gemini AI 분석
      const response = await fetch(`${API_BASE_URL}/api/gemini-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          options: {
            enableSentiment: true,
            enableKeywords: true,
            enableSummary: true
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 오류 (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Gemini AI 분석 실패');
      }
      
      const analysisResult = result.result;
      
      console.log('✅ Gemini AI analysis completed via server API:', {
        category: analysisResult.category,
        confidence: analysisResult.confidence,
        keywordsCount: analysisResult.keywords?.length || 0
      });
      
      return {
        sentiment: {
          score: analysisResult.sentiment?.score || 0.5,
          magnitude: analysisResult.sentiment?.magnitude || 0.5
        },
        entities: analysisResult.entities || [],
        categories: [{ 
          name: analysisResult.category, 
          confidence: analysisResult.confidence 
        }],
        keywords: analysisResult.keywords || [],
        summary: analysisResult.summary,
        geminiResult: {
          category: analysisResult.category,
          confidence: analysisResult.confidence,
          summary: analysisResult.summary,
          keywords: analysisResult.keywords || []
        }
      };
    } catch (error) {
      console.error('❌ Gemini AI 분석 실패:', error);
      // 실패 시 기본값 반환
      return {
        sentiment: { score: 0.1, magnitude: 0.8 },
        entities: [],
        categories: [{ name: '기타', confidence: 0.5 }],
        keywords: text.split(' ').slice(0, 5),
        summary: text.length > 100 ? text.substring(0, 100) + '...' : text,
        geminiResult: null
      };
    }
  };

  // 카테고리 분류 (Gemini AI 결과 사용)
  const performCategoryClassification = async (analysis: any) => {
    try {
      console.log('🏷️ Processing category classification with Gemini AI results...');
      
      if (analysis.geminiResult) {
        console.log('✅ Using Gemini AI categorization:', analysis.geminiResult.category);
        return {
          name: analysis.geminiResult.category,
          confidence: analysis.geminiResult.confidence
        };
      }
      
      if (analysis.categories && analysis.categories.length > 0) {
        return analysis.categories[0];
      }
      
      // 기본 카테고리
      return { name: '기타', confidence: 0.5 };
    } catch (error) {
      console.error('❌ Category classification failed:', error);
      return { name: '기타', confidence: 0.5 };
    }
  };

  // 카테고리별 맞춤형 요약 생성
  const generateCategorizedSummary = async (text: string, category: string): Promise<string> => {
    try {
      // 클라이언트 사이드 카테고리별 요약 생성
      if (typeof window !== 'undefined') {
        const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 5);
        
        switch (category) {
          case '쇼핑리스트':
            const items: string[] = [];
            const itemPatterns = [
              /(\w+)(?:\s+\w+)*\s*(?:사야|살|구매)/g,
              /(\w+)(?:\s+\w+)*\s*(?:개|병|팩|봉지)/g
            ];
            
            itemPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(text)) !== null) {
                items.push(match[1]);
              }
            });
            
            if (items.length > 0) {
              return `🛒 구매 목록:\n• ${items.slice(0, 5).join('\n• ')}\n\n세부 내용: ${sentences[0] || text.slice(0, 80)}`;
            }
            break;
            
          case '투두리스트':
            const tasks: string[] = [];
            const taskPatterns = [
              /(\w+(?:\s+\w+)*)\s*(?:해야|하자|할|완료)/g,
              /(\w+(?:\s+\w+)*)\s*(?:준비|작성|정리)/g
            ];
            
            taskPatterns.forEach(pattern => {
              let match;
              while ((match = pattern.exec(text)) !== null) {
                tasks.push(match[1]);
              }
            });
            
            if (tasks.length > 0) {
              return `✅ 할 일 목록:\n• ${tasks.slice(0, 4).join('\n• ')}\n\n상세: ${sentences[0] || text.slice(0, 80)}`;
            }
            break;
            
          case '약속 일정':
            const timeMatch = text.match(/(\d{1,2}시|\d{1,2}:\d{2}|오전|오후|내일|모레)/);
            const placeMatch = text.match(/(\w+(?:역|카페|식당|동|구))/);
            
            let summary = '📅 약속 정보:\n';
            if (timeMatch) summary += `• 시간: ${timeMatch[0]}\n`;
            if (placeMatch) summary += `• 장소: ${placeMatch[0]}\n`;
            summary += `• 내용: ${sentences[0] || text.slice(0, 80)}`;
            return summary;
            
          case '학교 수업 과제 일정':
            const subjectMatch = text.match(/(수학|영어|국어|과학|역사|물리|화학|생물)/);
            const deadlineMatch = text.match(/(\d+일|다음주|이번주|금요일|월요일)/);
            
            let studySummary = '🎓 학습 내용:\n';
            if (subjectMatch) studySummary += `• 과목: ${subjectMatch[0]}\n`;
            if (deadlineMatch) studySummary += `• 기한: ${deadlineMatch[0]}\n`;
            studySummary += `• 세부사항: ${sentences[0] || text.slice(0, 80)}`;
            return studySummary;
            
          case '아이디어':
            const keyIdeas = sentences.filter(s => 
              s.includes('아이디어') || s.includes('생각') || s.includes('방법')
            ).slice(0, 2);
            
            if (keyIdeas.length > 0) {
              return `💡 핵심 아이디어:\n• ${keyIdeas.join('\n• ')}\n\n전체 내용: ${text.slice(0, 100)}`;
            }
            break;
        }
        
        // 기본 요약
        return `📝 ${category} 요약:\n${sentences.slice(0, 2).join('. ')}.`;
      }
      
      // Cloud Run 서버를 통한 실제 GCP 서비스 호출
      console.log('📡 Calling server text analysis API...');
      const response = await fetch(`${API_BASE_URL}/api/text-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, options: {} })
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result.result.summary;
    } catch (error) {
      console.error('요약 생성 실패:', error);
      return `${category} 관련 내용: ${text.slice(0, 100)}${text.length > 100 ? '...' : ''}`;
    }
  };

  // 결과를 Firestore에 저장
  const saveVoiceProcessingResult = async (data: Partial<VoiceProcessingResult>): Promise<VoiceProcessingResult> => {
    try {
      const { firestoreService } = await import('@voice-organizer/firebase');

      console.log('💾 Saving voice memo to Firestore...');

      // CreateVoiceMemo 타입에 맞게 데이터 구성
      const createMemoData = {
        userId: user!.id,
        audioUrl: data.audioUrl || '',
        duration: 0, // 오디오 길이는 추후 계산 가능
        title: data.summary?.substring(0, 50) || '음성 메모',
        transcription: data.originalText || '',
        summary: data.summary || '',
        tags: data.keywords || [],
        category: data.category || '기타',
        // 확장 필드 (Firestore는 유연하게 저장 가능)
        categoryConfidence: data.categoryConfidence || 0.5,
        entities: data.entities || [],
        sentiment: data.sentiment || { score: 0, magnitude: 0 },
        processingTime: data.processingTime || 0,
      };

      // Firestore에 저장 (createMemo 메서드 사용)
      const docId = await firestoreService.createMemo(createMemoData);

      console.log('✅ Voice memo saved to Firestore:', docId);

      const voiceResult: VoiceProcessingResult = {
        id: docId,
        originalText: data.originalText || '',
        category: data.category || '기타',
        categoryConfidence: data.categoryConfidence || 0.5,
        summary: data.summary || '',
        entities: data.entities || [],
        sentiment: data.sentiment || { score: 0, magnitude: 0 },
        keywords: data.keywords || [],
        audioUrl: data.audioUrl || '',
        processingTime: data.processingTime || 0,
        createdAt: new Date()
      };

      return voiceResult;
    } catch (error) {
      console.error('❌ Firestore 저장 실패:', error);
      // 저장 실패해도 결과는 반환 (임시 ID 사용)
      return {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        originalText: data.originalText || '',
        category: data.category || '기타',
        categoryConfidence: data.categoryConfidence || 0.5,
        summary: data.summary || '',
        entities: data.entities || [],
        sentiment: data.sentiment || { score: 0, magnitude: 0 },
        keywords: data.keywords || [],
        audioUrl: data.audioUrl || '',
        processingTime: data.processingTime || 0,
        createdAt: new Date()
      };
    }
  };

  // 에러 핸들러
  const handleError = (error: string) => {
    setError(error);
    setProcessing(false);
    onError(error);
  };

  // 다시 시작
  const handleReset = () => {
    setCurrentStep('upload');
    setProcessing(false);
    setUploadResult(null);
    setError(null);
    setResult(null);
  };

  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="text-center py-8">
          <p className="text-gray-600 mb-4">음성 파일 업로드 및 처리를 위해서는 로그인이 필요합니다.</p>
          <Button onClick={() => window.location.href = '/auth'}>
            로그인하기
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 진행 상태 표시 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>음성 파일 처리</span>
            {result && (
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                새 파일 처리
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProcessingStatus 
            currentStep={currentStep}
            processing={processing}
            error={error}
          />
        </CardContent>
      </Card>

      {/* 업로드 인터페이스 */}
      {currentStep === 'upload' && !processing && (
        <AudioFileUpload
          onUploadComplete={handleUploadComplete}
          onUploadError={handleError}
          userId={user.id}
        />
      )}

      {/* 처리 결과 */}
      {result && currentStep === 'completed' && (
        <ProcessingResults result={result} />
      )}

      {/* 에러 표시 */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <span className="font-medium">오류:</span>
              <span>{error}</span>
            </div>
            <Button 
              onClick={handleReset} 
              variant="outline" 
              className="mt-4"
            >
              다시 시도
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default VoiceProcessor;