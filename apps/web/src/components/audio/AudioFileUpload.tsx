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
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div 
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5" />
          음성 파일 업로드
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 업로드 영역 */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : uploadState.status === 'error'
              ? 'border-red-300 bg-red-50'
              : uploadState.status === 'completed'
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploadState.status === 'idle' && (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                음성 파일을 여기에 드롭하거나 클릭해서 선택하세요
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                지원 형식: MP3, WAV, M4A, MP4, AAC, WebM, OGG<br />
                최대 크기: {maxFileSize}MB
              </p>
              <Button onClick={handleButtonClick} className="mt-2">
                파일 선택
              </Button>
            </>
          )}

          {uploadState.status === 'uploading' && (
            <>
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {uploadState.fileName} 업로드 중...
              </h3>
              <Progress value={uploadState.progress} className="w-full mb-2" />
              <p className="text-sm text-gray-500">
                {uploadState.progress}% 완료
              </p>
            </>
          )}

          {uploadState.status === 'completed' && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-green-900 mb-2">
                업로드 완료!
              </h3>
              <p className="text-sm text-green-600">
                {uploadState.fileName}
              </p>
              <Button 
                onClick={handleRetry} 
                variant="outline" 
                className="mt-4"
              >
                다른 파일 업로드
              </Button>
            </>
          )}

          {uploadState.status === 'error' && (
            <>
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">
                업로드 실패
              </h3>
              <p className="text-sm text-red-600 mb-4">
                {uploadState.error}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRetry} variant="outline">
                  다시 시도
                </Button>
                <Button onClick={handleButtonClick}>
                  다른 파일 선택
                </Button>
              </div>
            </>
          )}
        </div>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedExtensions.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* 도움말 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">업로드 안내</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 고품질의 음성 인식을 위해 조용한 환경에서 녹음된 파일을 사용하세요</li>
            <li>• 파일 크기가 클수록 처리 시간이 오래 걸릴 수 있습니다</li>
            <li>• 업로드된 파일은 안전하게 암호화되어 저장됩니다</li>
            <li>• 처리가 완료되면 자동으로 텍스트 변환과 분석이 시작됩니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default AudioFileUpload;