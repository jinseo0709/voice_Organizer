'use client';

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileAudio, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadProgress, UploadResult } from '@voice-organizer/firebase';

interface AudioFileUploadProps {
  onUploadComplete: (result: UploadResult) => void;
  onUploadError: (error: string) => void;
  maxFileSize?: number; // MB
  userId: string;
}

interface UploadState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  fileName: string;
  error?: string;
}

// Progress 컴포넌트가 없는 경우를 위한 간단한 구현
interface ProgressProps {
  value: number;
  className?: string;
}

function Progress({ value, className = '' }: ProgressProps) {
  return (
    <div className={`w-full bg-gray-100 rounded-full h-2.5 ${className}`}>
      <div 
        className="bg-gradient-to-r from-teal-400 to-teal-500 h-2.5 rounded-full transition-all duration-300" 
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function AudioFileUpload({ 
  onUploadComplete, 
  onUploadError, 
  maxFileSize = 50,
  userId 
}: AudioFileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
    progress: 0,
    fileName: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 허용되는 오디오 파일 형식 (더 넓은 지원)
  const allowedTypes = [
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/m4a',
    'audio/mp4',      // m4a 파일이 이 MIME 타입을 사용하기도 함
    'audio/x-m4a',    // m4a의 또 다른 MIME 타입
    'audio/mp4a-latm', // AAC in MP4 container
    'audio/aac',
    'audio/aacp',
    'audio/webm',
    'audio/ogg',
    'audio/vorbis',
    'video/mp4',      // m4a 파일이 video/mp4로 인식되기도 함
    'video/quicktime', // .mov 파일의 오디오도 m4a일 수 있음
    'application/octet-stream',  // MIME 타입을 인식하지 못할 때 사용
    ''  // 빈 MIME 타입도 허용 (일부 브라우저에서 발생할 수 있음)
  ];

  // 허용되는 파일 확장자
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.webm', '.ogg', '.mp4'];

  // 파일 유효성 검사
  const validateFile = (file: File): string | null => {
    // 파일 크기 검사
    if (file.size > maxFileSize * 1024 * 1024) {
      return `파일 크기가 ${maxFileSize}MB를 초과할 수 없습니다.`;
    }

    // 파일 확장자 검사 (대소문자 무시)
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    // 확장자 기반으로 검증 (더 안정적)
    if (!hasValidExtension) {
      return '지원되지 않는 파일 형식입니다. MP3, WAV, M4A, AAC, WebM, OGG 파일만 업로드 가능합니다.';
    }

    return null;
  };

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setUploadState({ status: 'error', progress: 0, fileName: file.name, error });
      onUploadError(error);
      return;
    }

    setUploadState({ status: 'uploading', progress: 0, fileName: file.name });

    try {
      console.log('🚀 Starting REAL Firebase Storage upload...');
      
      // 실제 Firebase Storage 서비스 import 및 업로드
      const { storageService } = await import('@voice-organizer/firebase');
      
      // 진행률 업데이트 (25%)
      setUploadState(prev => ({ ...prev, progress: 25 }));
      
      console.log('📤 Uploading to Firebase Storage:', {
        userId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      // 실제 Firebase Storage 업로드 실행
      const result = await storageService.uploadAudioFile(
        userId,
        file,
        file.name,
        {
          customMetadata: {
            originalName: file.name,
            uploadSource: 'web-app',
            userAgent: navigator.userAgent
          }
        }
      );

      // 진행률 업데이트 (75%)
      setUploadState(prev => ({ ...prev, progress: 75 }));
      
      console.log('✅ Firebase Storage upload SUCCESS:', result);

      // 업로드 완료 - 100%로 설정
      setUploadState(prev => ({ ...prev, progress: 100 }));
      await new Promise(resolve => setTimeout(resolve, 500)); // UI 피드백

      setUploadState({ status: 'completed', progress: 100, fileName: file.name });
      onUploadComplete(result);

    } catch (error) {
      console.error('❌ Firebase Storage upload FAILED:', error);
      const errorMessage = error instanceof Error ? error.message : 'Firebase Storage 업로드 중 오류가 발생했습니다.';
      setUploadState({ status: 'error', progress: 0, fileName: file.name, error: errorMessage });
      onUploadError(errorMessage);
    }
  }, [userId, maxFileSize, onUploadComplete, onUploadError]);

  // 드래그 앤 드롭 핸들러
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  // 파일 선택 버튼 클릭
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 업로드 재시도
  const handleRetry = () => {
    setUploadState({ status: 'idle', progress: 0, fileName: '' });
  };

  return (
    <div className="w-full space-y-4">
      {/* 업로드 영역 */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-500 cursor-pointer group ${
          dragActive
            ? 'border-teal-400 bg-teal-50/80 scale-[1.02] shadow-lg shadow-teal-100'
            : uploadState.status === 'error'
            ? 'border-red-200 bg-red-50/30'
            : uploadState.status === 'completed'
            ? 'border-teal-300 bg-teal-50/30'
            : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50/20 bg-white/80'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={uploadState.status === 'idle' ? handleButtonClick : undefined}
      >
        {/* 배경 파형 애니메이션 */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center gap-[3px] opacity-[0.15]">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-teal-400 rounded-full"
                style={{
                  height: `${20 + Math.sin(i * 0.3) * 15 + Math.random() * 10}%`,
                  animation: `wave-pulse-smooth-${(i % 3) + 1} ${2 + (i % 5) * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
          <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full transition-all duration-700 ${
            dragActive ? 'bg-teal-200/40 scale-150' : 'bg-teal-100/20'
          }`} />
          <div className={`absolute -bottom-16 -left-16 w-32 h-32 rounded-full transition-all duration-700 ${
            dragActive ? 'bg-teal-200/40 scale-150' : 'bg-teal-50/30'
          }`} />
        </div>

        <div className="relative z-10">
          {uploadState.status === 'idle' && (
            <div className="space-y-4">
              <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-teal-200/50 ${
                dragActive ? 'scale-125 rotate-6 shadow-teal-300/60' : ''
              }`}>
                <Upload className="h-10 w-10 text-white stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">
                  음성 파일 업로드
                </h3>
                <p className="text-gray-500 font-light mb-1">
                  파일을 드래그하거나 클릭해서 선택하세요
                </p>
                <p className="text-sm text-gray-400 font-light">
                  MP3, WAV, M4A, AAC, WebM, OGG • 최대 {maxFileSize}MB
                </p>
              </div>
              <Button 
                onClick={(e) => { e.stopPropagation(); handleButtonClick(); }}
                className="mt-2 bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white px-8 py-2.5 rounded-xl shadow-md shadow-teal-200/50 hover:shadow-lg hover:shadow-teal-300/50 transform hover:scale-105 transition-all duration-300"
              >
                <FileAudio className="h-4 w-4 mr-2 stroke-[1.5]" />
                파일 선택
              </Button>
            </div>
          )}

          {uploadState.status === 'uploading' && (
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-teal-50 flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-teal-500 stroke-[1.5] animate-spin" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-gray-800 mb-2">
                  업로드 중...
                </h3>
                <p className="text-sm text-gray-400 font-light mb-4 truncate max-w-xs mx-auto">
                  {uploadState.fileName}
                </p>
              </div>
              <div className="max-w-xs mx-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-light">진행률</span>
                  <span className="font-medium text-teal-600">{uploadState.progress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-400 to-teal-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {uploadState.status === 'completed' && (
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-teal-50 flex items-center justify-center animate-bounce-once">
                <CheckCircle2 className="h-10 w-10 text-teal-500 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-teal-700 mb-2">
                  업로드 완료!
                </h3>
                <p className="text-sm text-teal-600 font-light truncate max-w-xs mx-auto">
                  {uploadState.fileName}
                </p>
              </div>
              <Button 
                onClick={(e) => { e.stopPropagation(); handleRetry(); }}
                variant="outline" 
                className="mt-2 rounded-xl border-teal-200 text-teal-600 hover:bg-teal-50 transition-all duration-200"
              >
                다른 파일 업로드
              </Button>
            </div>
          )}

          {uploadState.status === 'error' && (
            <div className="space-y-4">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center animate-shake">
                <AlertCircle className="h-10 w-10 text-red-400 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-red-600 mb-2">
                  업로드 실패
                </h3>
                <p className="text-sm text-red-400 font-light mb-4">
                  {uploadState.error}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={(e) => { e.stopPropagation(); handleRetry(); }}
                  variant="outline"
                  className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200"
                >
                  다시 시도
                </Button>
                <Button 
                  onClick={(e) => { e.stopPropagation(); handleButtonClick(); }}
                  className="rounded-xl bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white transition-all duration-200"
                >
                  다른 파일
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedExtensions.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 도움말 - 업로드 대기 상태에서만 표시 */}
      {uploadState.status === 'idle' && (
        <div className="bg-gradient-to-r from-teal-50/50 to-white rounded-xl p-4 border border-teal-100/50">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-teal-100/60 rounded-lg">
              <FileAudio className="h-4 w-4 text-teal-500 stroke-[1.5]" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-gray-700 mb-1">💡 팁</p>
              <p className="text-gray-500 font-light">
                조용한 환경에서 녹음된 파일이 더 정확하게 인식됩니다. 
                업로드 후 AI가 자동으로 텍스트 변환과 카테고리 분류를 수행합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AudioFileUpload;