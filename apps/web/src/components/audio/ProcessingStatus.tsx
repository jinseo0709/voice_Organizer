'use client';

import React from 'react';
import { ProcessingStep } from './VoiceProcessor';
import { CheckCircle, Loader2, XCircle, Upload, Mic, Brain, Tag, FileText, Save, Sparkles } from 'lucide-react';

interface ProcessingStatusProps {
  currentStep: ProcessingStep;
  processing: boolean;
  error?: string | null;
}

// 모던 프로그레스 바 컴포넌트
interface ProgressProps {
  value: number;
  className?: string;
  error?: boolean;
}

function Progress({ value, className = '', error = false }: ProgressProps) {
  return (
    <div className={`relative w-full h-3 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-gray-100" />
      
      {/* 진행 바 */}
      <div 
        className={`relative h-full rounded-full transition-all duration-700 ease-out ${
          error 
            ? 'bg-gradient-to-r from-red-400 to-red-500' 
            : 'bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500'
        }`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      >
        {/* 반짝이는 효과 */}
        {!error && value > 0 && value < 100 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        )}
      </div>
      
      {/* 완료시 빛나는 효과 */}
      {value >= 100 && !error && (
        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse" />
      )}
    </div>
  );
}

// 처리 단계 정의 (모던 아이콘 & 색상)
const PROCESSING_STEPS = [
  {
    key: 'upload' as ProcessingStep,
    title: '파일 업로드',
    description: '음성 파일을 클라우드에 안전하게 업로드합니다',
    icon: Upload,
    color: 'from-blue-400 to-cyan-400'
  },
  {
    key: 'speech-to-text' as ProcessingStep,
    title: '음성 인식',
    description: 'AI가 음성을 정확한 텍스트로 변환합니다',
    icon: Mic,
    color: 'from-violet-400 to-purple-400'
  },
  {
    key: 'text-analysis' as ProcessingStep,
    title: '텍스트 분석',
    description: '감정, 키워드, 핵심 내용을 분석합니다',
    icon: Brain,
    color: 'from-pink-400 to-rose-400'
  },
  {
    key: 'category-classification' as ProcessingStep,
    title: '카테고리 분류',
    description: '투두, 쇼핑, 약속 등 6개 카테고리로 분류합니다',
    icon: Tag,
    color: 'from-amber-400 to-orange-400'
  },
  {
    key: 'summary-generation' as ProcessingStep,
    title: '요약 생성',
    description: 'Gemini AI가 맞춤형 요약을 생성합니다',
    icon: FileText,
    color: 'from-emerald-400 to-teal-400'
  },
  {
    key: 'saving' as ProcessingStep,
    title: '저장',
    description: '결과를 안전하게 저장합니다',
    icon: Save,
    color: 'from-indigo-400 to-blue-400'
  },
  {
    key: 'completed' as ProcessingStep,
    title: '완료',
    description: '모든 처리가 성공적으로 완료되었습니다',
    icon: CheckCircle,
    color: 'from-green-400 to-emerald-400'
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

  return (
    <div className="space-y-8">
      {/* 전체 진행률 - 모던 스타일 */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-lg ${error ? 'bg-red-100' : 'bg-gradient-to-r from-violet-100 to-purple-100'}`}>
              <Sparkles className={`h-4 w-4 ${error ? 'text-red-500' : 'text-violet-600'}`} />
            </div>
            <span className="font-semibold text-gray-800">전체 진행률</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            error 
              ? 'bg-red-100 text-red-600' 
              : progress >= 100 
                ? 'bg-green-100 text-green-600' 
                : 'bg-violet-100 text-violet-600'
          }`}>
            {error ? '오류' : `${Math.round(progress)}%`}
          </div>
        </div>
        <Progress 
          value={error ? progress : progress} 
          error={!!error}
        />
      </div>

      {/* 단계별 상태 - 타임라인 스타일 */}
      <div className="relative">
        {/* 연결 라인 */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 via-gray-200 to-gray-100" />
        
        <div className="space-y-4">
          {PROCESSING_STEPS.map((step, index) => {
            const status = getStepStatus(index);
            const IconComponent = step.icon;
            const isActive = status === 'processing' || status === 'current';
            const isCompleted = status === 'completed';
            const isError = status === 'error';
            
            return (
              <div 
                key={step.key} 
                className={`relative flex items-start space-x-4 p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 shadow-sm' 
                    : isCompleted 
                      ? 'bg-green-50/50'
                      : isError
                        ? 'bg-red-50'
                        : 'hover:bg-gray-50'
                }`}
              >
                {/* 아이콘 */}
                <div className={`relative z-10 flex-shrink-0 p-2.5 rounded-xl shadow-sm transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white' 
                    : isActive
                      ? `bg-gradient-to-br ${step.color} text-white animate-pulse`
                      : isError
                        ? 'bg-gradient-to-br from-red-400 to-red-500 text-white'
                        : 'bg-white border-2 border-gray-200 text-gray-400'
                }`}>
                  {status === 'processing' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isError ? (
                    <XCircle className="h-5 w-5" />
                  ) : (
                    <IconComponent className="h-5 w-5" />
                  )}
                </div>
                
                {/* 내용 */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between">
                    <p className={`font-medium ${
                      isCompleted ? 'text-green-700' 
                        : isActive ? 'text-violet-700'
                        : isError ? 'text-red-700'
                        : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    
                    {/* 상태 배지 */}
                    {isCompleted && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        ✓ 완료
                      </span>
                    )}
                    {status === 'processing' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200 animate-pulse">
                        ⚡ 진행중
                      </span>
                    )}
                    {status === 'current' && !processing && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                        대기중
                      </span>
                    )}
                    {isError && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        ✗ 실패
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 ${
                    isActive ? 'text-violet-600' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 에러 메시지 - 모던 스타일 */}
      {error && (
        <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-start space-x-4">
            <div className="flex-shrink-0 p-2 bg-red-100 rounded-xl">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-red-800">
                처리 중 오류가 발생했습니다
              </h3>
              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
              <p className="mt-2 text-xs text-red-500">
                다시 시도하거나 파일을 확인해주세요
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 진행중 메시지 - 모던 스타일 */}
      {processing && !error && (
        <div className="relative overflow-hidden bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
          
          {/* 움직이는 배경 점들 */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-violet-300 rounded-full opacity-30 animate-float"
                style={{
                  left: `${20 + i * 20}%`,
                  top: `${30 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${2 + i * 0.5}s`
                }}
              />
            ))}
          </div>
          
          <div className="relative flex items-start space-x-4">
            <div className="flex-shrink-0 p-2 bg-violet-100 rounded-xl">
              <Loader2 className="h-6 w-6 text-violet-600 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-violet-800">
                {PROCESSING_STEPS[currentStepIndex]?.title} 진행중
              </h3>
              <p className="mt-1 text-sm text-violet-600">
                {PROCESSING_STEPS[currentStepIndex]?.description}
              </p>
              <div className="mt-2 flex items-center space-x-1">
                <span className="text-xs text-violet-500">처리 중</span>
                <span className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <span 
                      key={i}
                      className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 완료 메시지 - 모던 스타일 */}
      {currentStep === 'completed' && !error && (
        <div className="relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
          
          {/* 축하 파티클 */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-float opacity-40"
                style={{
                  left: `${10 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                  backgroundColor: ['#34d399', '#10b981', '#059669', '#6ee7b7'][i % 4],
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${1.5 + i * 0.3}s`
                }}
              />
            ))}
          </div>
          
          <div className="relative flex items-start space-x-4">
            <div className="flex-shrink-0 p-2 bg-green-100 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-green-800 flex items-center space-x-2">
                <span>처리 완료!</span>
                <span className="text-lg">🎉</span>
              </h3>
              <p className="mt-1 text-sm text-green-600">
                음성 파일 분석이 성공적으로 완료되었습니다
              </p>
              <p className="mt-2 text-xs text-green-500">
                결과를 확인해주세요
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 커스텀 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.4; }
          50% { transform: translateY(-10px) scale(1.1); opacity: 0.6; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default ProcessingStatus;