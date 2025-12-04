'use client';

import React from 'react';
import { ProcessingStep } from './VoiceProcessor';
import { CheckCircle, Circle, Loader2, XCircle, Upload, Mic, Brain, Tag, FileText, Save } from 'lucide-react';

interface ProcessingStatusProps {
  currentStep: ProcessingStep;
  processing: boolean;
  error?: string | null;
}

// Progress 컴포넌트가 없는 경우를 위한 간단한 구현
interface ProgressProps {
  value: number;
  className?: string;
}

function Progress({ value, className = '' }: ProgressProps) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div 
        className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// 처리 단계 정의
const PROCESSING_STEPS = [
  {
    key: 'upload' as ProcessingStep,
    title: '파일 업로드',
    description: '음성 파일을 업로드합니다',
    icon: Upload
  },
  {
    key: 'speech-to-text' as ProcessingStep,
    title: '음성 인식',
    description: '음성을 텍스트로 변환합니다',
    icon: Mic
  },
  {
    key: 'text-analysis' as ProcessingStep,
    title: '텍스트 분석',
    description: '텍스트의 감정, 개체, 키워드를 분석합니다',
    icon: Brain
  },
  {
    key: 'category-classification' as ProcessingStep,
    title: '카테고리 분류',
    description: '내용을 6개 카테고리로 분류합니다',
    icon: Tag
  },
  {
    key: 'summary-generation' as ProcessingStep,
    title: '요약 생성',
    description: '카테고리별 맞춤형 요약을 생성합니다',
    icon: FileText
  },
  {
    key: 'saving' as ProcessingStep,
    title: '저장',
    description: '결과를 데이터베이스에 저장합니다',
    icon: Save
  },
  {
    key: 'completed' as ProcessingStep,
    title: '완료',
    description: '모든 처리가 완료되었습니다',
    icon: CheckCircle
  }
];

export function ProcessingStatus({ currentStep, processing, error }: ProcessingStatusProps) {
  // 현재 단계의 인덱스 찾기
  const currentStepIndex = PROCESSING_STEPS.findIndex(step => step.key === currentStep);
  
  // 진행률 계산
  const progress = currentStepIndex >= 0 ? ((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100 : 0;

  // 단계 상태 결정
  const getStepStatus = (stepIndex: number) => {
    if (error) {
      if (stepIndex === currentStepIndex) return 'error';
      if (stepIndex < currentStepIndex) return 'completed';
      return 'pending';
    }
    
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) {
      if (currentStep === 'completed') return 'completed';
      if (processing) return 'processing';
      return 'current';
    }
    return 'pending';
  };

  // 상태별 색상 및 아이콘 결정
  const getStepIcon = (step: typeof PROCESSING_STEPS[0], status: string) => {
    const IconComponent = step.icon;
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'current':
        return <IconComponent className="h-5 w-5 text-blue-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStepTextColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
      case 'current':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* 전체 진행률 */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">전체 진행률</span>
          <span className={error ? 'text-red-600' : 'text-gray-600'}>
            {error ? '오류 발생' : `${Math.round(progress)}%`}
          </span>
        </div>
        <Progress 
          value={error ? 0 : progress} 
          className={`h-2 ${error ? 'bg-red-50' : ''}`}
        />
      </div>

      {/* 단계별 상태 */}
      <div className="space-y-4">
        {PROCESSING_STEPS.map((step, index) => {
          const status = getStepStatus(index);
          const textColor = getStepTextColor(status);
          
          return (
            <div key={step.key} className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getStepIcon(step, status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${textColor}`}>
                  {step.title}
                </p>
                <p className={`text-xs ${
                  status === 'pending' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
              </div>
              
              {/* 상태 표시 */}
              <div className="flex-shrink-0">
                {status === 'completed' && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    완료
                  </span>
                )}
                {status === 'processing' && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    진행중
                  </span>
                )}
                {status === 'current' && !processing && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full border border-blue-200">
                    대기중
                  </span>
                )}
                {status === 'error' && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                    실패
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                처리 중 오류가 발생했습니다
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 현재 단계 상세 정보 */}
      {processing && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <Loader2 className="h-5 w-5 text-blue-400 animate-spin flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {PROCESSING_STEPS[currentStepIndex]?.title} 진행중
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                {PROCESSING_STEPS[currentStepIndex]?.description}
                <br />
                <span className="text-xs">잠시만 기다려주세요...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 완료 메시지 */}
      {currentStep === 'completed' && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                처리 완료
              </h3>
              <div className="mt-2 text-sm text-green-700">
                음성 파일 처리가 성공적으로 완료되었습니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProcessingStatus;