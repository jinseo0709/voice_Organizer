'use client';

import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Calendar,
  Clock,
  FileAudio,
  Tag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VoiceMemo } from '@voice-organizer/shared';

interface VoiceMemoListProps {
  memos: VoiceMemo[];
  onPlay?: (memo: VoiceMemo) => void;
  onDelete?: (memoId: string) => void;
  onDownload?: (memo: VoiceMemo) => void;
  loading?: boolean;
}

interface PlayingState {
  memoId: string | null;
  isPlaying: boolean;
}

export function VoiceMemoList({ 
  memos, 
  onPlay, 
  onDelete, 
  onDownload,
  loading = false 
}: VoiceMemoListProps) {
  const [playingState, setPlayingState] = useState<PlayingState>({
    memoId: null,
    isPlaying: false
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 컴포넌트 언마운트 시 오디오 정리
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 오디오 재생/일시정지
  const togglePlayback = async (memo: VoiceMemo) => {
    try {
      // 현재 재생 중인 메모와 같은지 확인
      if (playingState.memoId === memo.id) {
        if (playingState.isPlaying) {
          audioRef.current?.pause();
          setPlayingState(prev => ({ ...prev, isPlaying: false }));
        } else {
          await audioRef.current?.play();
          setPlayingState(prev => ({ ...prev, isPlaying: true }));
        }
        return;
      }

      // 새로운 오디오 재생
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(memo.audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingState({ memoId: null, isPlaying: false });
      };

      audio.onerror = () => {
        console.error('오디오 재생 실패:', memo.id);
        setPlayingState({ memoId: null, isPlaying: false });
      };

      await audio.play();
      setPlayingState({ memoId: memo.id, isPlaying: true });

      // 외부 콜백 호출
      if (onPlay) {
        onPlay(memo);
      }
    } catch (error) {
      console.error('재생 오류:', error);
    }
  };

  // 메모 삭제
  const handleDelete = (memo: VoiceMemo) => {
    // 재생 중인 메모를 삭제하는 경우 재생 중지
    if (playingState.memoId === memo.id) {
      audioRef.current?.pause();
      setPlayingState({ memoId: null, isPlaying: false });
    }

    if (onDelete) {
      onDelete(memo.id);
    }
  };

  // 다운로드
  const handleDownload = (memo: VoiceMemo) => {
    if (onDownload) {
      onDownload(memo);
    }
  };

  // 시간 포맷팅
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 날짜 포맷팅
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="flex gap-1">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 메모가 없는 경우
  if (memos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <FileAudio size={32} className="text-gray-400" />
        </div>
        <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">
          저장된 음성 메모가 없습니다
        </h3>
        <p className="text-sm text-gray-500">
          첫 번째 음성 메모를 녹음해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {memos.map((memo) => {
        const isCurrentlyPlaying = playingState.memoId === memo.id && playingState.isPlaying;

        return (
          <div 
            key={memo.id} 
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
          >
            <div className="p-4">
              {/* 모바일 레이아웃 */}
              <div className="flex items-start gap-3">
                {/* 재생 버튼 */}
                <Button
                  onClick={() => togglePlayback(memo)}
                  variant={isCurrentlyPlaying ? "default" : "outline"}
                  size="lg"
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex-shrink-0 active:scale-95 transition-transform touch-manipulation ${
                    isCurrentlyPlaying ? 'bg-blue-500 hover:bg-blue-600' : ''
                  }`}
                >
                  {isCurrentlyPlaying ? <Pause size={18} /> : <Play size={18} />}
                </Button>

                {/* 메모 정보 */}
                <div className="flex-1 min-w-0">
                  {/* 제목과 액션 버튼 */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">
                      {memo.title || `음성 메모 #${memo.id.slice(0, 8)}`}
                    </h3>
                    
                    {/* 액션 버튼들 - 모바일에서는 가로 배열 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        onClick={() => handleDownload(memo)}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 touch-manipulation"
                        title="다운로드"
                      >
                        <Download size={14} />
                      </Button>
                      <Button
                        onClick={() => handleDelete(memo)}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-red-500 hover:text-red-700 touch-manipulation"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* 메타데이터 - 모바일에서는 스택 레이아웃 */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatDuration(memo.duration)}</span>
                      </div>
                      <span className="hidden sm:inline">{formatFileSize(memo.fileSize || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={12} />
                      <span>{formatDate(memo.createdAt)}</span>
                    </div>
                  </div>

                  {/* 태그 */}
                  {memo.tags && memo.tags.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {memo.tags.slice(0, 3).map((tag: string) => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                        {memo.tags.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{memo.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 요약/전사 텍스트 미리보기 */}
                  {(memo.summary || memo.transcription) && (
                    <div className="mt-3 p-2 bg-gray-50 rounded-md">
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {memo.summary || memo.transcription}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 재생 상태 표시 */}
              {isCurrentlyPlaying && (
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>재생 중</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

