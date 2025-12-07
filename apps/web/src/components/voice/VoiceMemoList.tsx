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
  Tag,
  ExternalLink,
  CheckSquare,
  ShoppingCart,
  GraduationCap,
  Lightbulb,
  MoreHorizontal,
  Check,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { VoiceMemo } from '@voice-organizer/shared';

// 카테고리별 요약 타입 (VoiceMemo.allCategories에서 사용)
interface CategorySummary {
  category: string;
  summary?: string;
  summary_list?: string[];
  ai_supplement?: string;
}

// 카테고리별 아이콘 및 색상 설정
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  '쇼핑리스트': { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  '투두리스트': { icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  '약속 일정': { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  '학교 수업 과제 일정': { icon: GraduationCap, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  '아이디어': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  '기타': { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' }
};

// 🗓️ 약속 일정에서 날짜/시간 파싱 및 Google Calendar URL 생성
function parseAppointmentForCalendar(text: string): { 
  title: string; 
  startDate: Date | null; 
  location: string;
  calendarUrl: string | null;
} {
  const now = new Date();
  let startDate: Date | null = null;
  let location = '';
  let title = text;
  
  // 날짜 패턴 매칭
  const datePatterns = [
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
    /(\d{1,2})월\s*(\d{1,2})일/,
    /(내일|모레|오늘)/
  ];
  
  // 시간 패턴 매칭
  const timePatterns = [
    /(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/,
    /(\d{1,2}):(\d{2})/,
    /(\d{1,2})시(?:\s*(\d{1,2})분)?/
  ];
  
  // 장소 패턴 매칭
  const locationPatterns = [
    /에서\s+(.+?)(?:에서|와|과|랑|$)/,
    /(\S+(?:역|카페|식당|공원|센터|빌딩))\s*(?:에서|에)/
  ];
  
  // 날짜 추출
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('년')) {
        startDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else if (match[0] === '내일') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 1);
      } else if (match[0] === '모레') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 2);
      } else if (match[0] === '오늘') {
        startDate = new Date(now);
      } else if (match[0].includes('월')) {
        startDate = new Date(now.getFullYear(), parseInt(match[1]) - 1, parseInt(match[2]));
        if (startDate < now) startDate.setFullYear(startDate.getFullYear() + 1);
      }
      break;
    }
  }
  
  // 시간 추출
  if (startDate) {
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        let hours = 0, minutes = 0;
        if (match[0].includes('오전') || match[0].includes('오후')) {
          hours = parseInt(match[2]);
          minutes = match[3] ? parseInt(match[3]) : 0;
          if (match[1] === '오후' && hours !== 12) hours += 12;
        } else if (match[0].includes(':')) {
          hours = parseInt(match[1]);
          minutes = parseInt(match[2]);
        } else {
          hours = parseInt(match[1]);
          minutes = match[2] ? parseInt(match[2]) : 0;
        }
        startDate.setHours(hours, minutes, 0, 0);
        break;
      }
    }
  }
  
  // 장소 추출
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      break;
    }
  }
  
  // Google Calendar URL 생성
  let calendarUrl: string | null = null;
  if (startDate && isValid(startDate)) {
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    
    const formatGoogleDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title.slice(0, 50),
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: `음성 메모: ${text}`,
      ...(location && { location })
    });
    
    calendarUrl = `https://www.google.com/calendar/render?${params.toString()}`;
  }
  
  return { title, startDate, location, calendarUrl };
}

// 체크된 항목 상태 타입 (memoId_categoryIdx_itemIdx 형식으로 키 저장)
export type CheckedItemsState = Record<string, boolean>;
export type CartItemsState = Record<string, boolean>;

interface VoiceMemoListProps {
  memos: VoiceMemo[];
  onPlay?: (memo: VoiceMemo) => void;
  onDelete?: (memoId: string) => void;
  onDownload?: (memo: VoiceMemo) => void;
  loading?: boolean;
  selectedCategory?: string; // 선택된 카테고리 (all이면 전체 표시)
  checkedItems?: CheckedItemsState; // 부모에서 관리하는 체크 상태
  onCheckedItemsChange?: (items: CheckedItemsState) => void; // 체크 상태 변경 콜백
  cartItems?: CartItemsState; // 부모에서 관리하는 장바구니 상태
  onCartItemsChange?: (items: CartItemsState) => void; // 장바구니 상태 변경 콜백
  showCompletedOnly?: boolean; // 완료된 항목만 표시하는 필터 모드
}

interface PlayingState {
  memoId: string | null;
  isPlaying: boolean;
}

// 장바구니에 담긴 항목 상태
type CartItems = Record<string, boolean>;

export function VoiceMemoList({ 
  memos, 
  onPlay, 
  onDelete, 
  onDownload,
  loading = false,
  selectedCategory = 'all',
  checkedItems: externalCheckedItems,
  onCheckedItemsChange,
  cartItems: externalCartItems,
  onCartItemsChange,
  showCompletedOnly = false
}: VoiceMemoListProps) {
  const [playingState, setPlayingState] = useState<PlayingState>({
    memoId: null,
    isPlaying: false
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 투두리스트 체크 상태 (외부에서 받거나 내부에서 관리)
  const [internalCheckedItems, setInternalCheckedItems] = useState<CheckedItemsState>({});
  const checkedItems = externalCheckedItems ?? internalCheckedItems;
  
  // 쇼핑리스트 장바구니 담기 상태 (외부에서 받거나 내부에서 관리)
  const [internalCartItems, setInternalCartItems] = useState<CartItems>({});
  const cartItems = externalCartItems ?? internalCartItems;

  // 투두 항목 토글
  const toggleTodoItem = (key: string) => {
    const newCheckedItems = {
      ...checkedItems,
      [key]: !checkedItems[key]
    };
    
    if (onCheckedItemsChange) {
      onCheckedItemsChange(newCheckedItems);
    } else {
      setInternalCheckedItems(newCheckedItems);
    }
  };

  // 쇼핑 항목 장바구니 토글
  const toggleCartItem = (key: string) => {
    const newCartItems = {
      ...cartItems,
      [key]: !cartItems[key]
    };
    
    if (onCartItemsChange) {
      onCartItemsChange(newCartItems);
    } else {
      setInternalCartItems(newCartItems);
    }
  };

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
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/3"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-lg"></div>
                <div className="w-8 h-8 bg-gray-100 rounded-lg"></div>
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
      <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
          <FileAudio size={32} className="text-gray-300 stroke-[1.5]" />
        </div>
        <h3 className="text-lg font-medium text-gray-700 mb-2">
          저장된 음성 메모가 없습니다
        </h3>
        <p className="text-sm font-light text-gray-400">
          첫 번째 음성 메모를 녹음해보세요
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {memos.map((memo) => {
        const isCurrentlyPlaying = playingState.memoId === memo.id && playingState.isPlaying;

        return (
          <div 
            key={memo.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200"
          >
            <div className="p-5">
              {/* 모바일 레이아웃 */}
              <div className="flex items-start gap-4">
                {/* 재생 버튼 - 명확한 디자인 */}
                <button
                  onClick={() => togglePlayback(memo)}
                  className={`flex flex-col items-center justify-center flex-shrink-0 active:scale-95 transition-all duration-200 touch-manipulation ${
                    isCurrentlyPlaying 
                      ? 'bg-teal-600 hover:bg-teal-700' 
                      : 'bg-gradient-to-br from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600'
                  } rounded-xl p-2 shadow-md hover:shadow-lg`}
                  title="원본 음성 듣기"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    {isCurrentlyPlaying ? (
                      <Pause size={24} className="text-white stroke-[1.5]" />
                    ) : (
                      <Play size={24} className="text-white stroke-[1.5] ml-1" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-xs text-white font-medium mt-0.5">
                    {isCurrentlyPlaying ? '일시정지' : 'PLAY'}
                  </span>
                </button>

                {/* 메모 정보 */}
                <div className="flex-1 min-w-0">
                  {/* 제목과 액션 버튼 */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-gray-800 text-sm sm:text-base leading-tight line-clamp-2">
                      {memo.title || `음성 메모 #${memo.id.slice(0, 8)}`}
                    </h3>
                    
                    {/* 액션 버튼들 - 모바일에서는 가로 배열 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        onClick={() => handleDownload(memo)}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 touch-manipulation text-gray-400 hover:text-teal-600 transition-colors"
                        title="다운로드"
                      >
                        <Download size={14} className="stroke-[1.5]" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(memo)}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-gray-400 hover:text-red-500 transition-colors touch-manipulation"
                        title="삭제"
                      >
                        <Trash2 size={14} className="stroke-[1.5]" />
                      </Button>
                    </div>
                  </div>

                  {/* 메타데이터 - 모바일에서는 스택 레이아웃 */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-400 font-light">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="stroke-[1.5]" />
                        <span>{formatDuration(memo.duration)}</span>
                      </div>
                      <span className="hidden sm:inline">{formatFileSize(memo.fileSize || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 font-light">
                      <Calendar size={12} className="stroke-[1.5]" />
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
                            className="inline-block px-2 py-0.5 text-xs bg-teal-50 text-teal-600 rounded-full font-light"
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

                  {/* 카테고리별 요약 표시 (allCategories가 있는 경우) */}
                  {memo.allCategories && memo.allCategories.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {memo.allCategories
                        .filter((cat: CategorySummary) => 
                          selectedCategory === 'all' || cat.category === selectedCategory
                        )
                        // 완료 필터 모드에서는 완료된 항목이 있는 카테고리만 표시
                        .filter((cat: CategorySummary, idx: number) => {
                          if (!showCompletedOnly) return true; // 일반 모드에서는 모든 카테고리 표시
                          
                          const summaryItems = cat.summary_list || [];
                          if (summaryItems.length === 0) return false;
                          
                          // 투두리스트/학교과제: 체크된 항목이 있는지 확인
                          if (cat.category === '투두리스트' || cat.category === '학교 수업 과제 일정') {
                            return summaryItems.some((_: string, itemIdx: number) => 
                              checkedItems[`${memo.id}_${idx}_${itemIdx}`]
                            );
                          }
                          // 쇼핑리스트: 담긴 항목이 있는지 확인
                          if (cat.category === '쇼핑리스트') {
                            return summaryItems.some((_: string, itemIdx: number) => 
                              cartItems[`${memo.id}_${idx}_${itemIdx}`]
                            );
                          }
                          // 아이디어: 체크된 항목이 있는지 확인
                          if (cat.category === '아이디어') {
                            return summaryItems.some((_: string, itemIdx: number) => 
                              checkedItems[`${memo.id}_${idx}_${itemIdx}`]
                            );
                          }
                          // 나머지 카테고리는 완료 필터에서 표시 안함
                          return false;
                        })
                        .map((cat: CategorySummary, idx: number) => {
                        // 원본 인덱스를 찾아야 함 (키 생성을 위해)
                        const originalIdx = memo.allCategories!.findIndex(
                          (c: CategorySummary) => c.category === cat.category
                        );
                        const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG['기타'];
                        const IconComponent = config.icon;
                        const summaryItems = cat.summary_list || [];

                        return (
                          <div key={idx} className={`p-4 rounded-xl ${config.bg} border ${config.border} transition-all duration-200 hover:shadow-sm`}>
                            {/* 카테고리 헤더 */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <div className={`p-1.5 rounded-lg bg-white/60`}>
                                  <IconComponent className={`h-4 w-4 stroke-[1.5] ${config.color}`} />
                                </div>
                                <span className={`text-sm font-medium ${config.color}`}>{cat.category}</span>
                              </div>
                              <span className="text-xs text-gray-400 font-light">
                                {showCompletedOnly 
                                  ? `${summaryItems.filter((_: string, itemIdx: number) => {
                                      if (cat.category === '쇼핑리스트') {
                                        return cartItems[`${memo.id}_${originalIdx}_${itemIdx}`];
                                      }
                                      return checkedItems[`${memo.id}_${originalIdx}_${itemIdx}`];
                                    }).length}개 완료`
                                  : `${summaryItems.filter((_: string, itemIdx: number) => {
                                      if (cat.category === '쇼핑리스트') {
                                        return !cartItems[`${memo.id}_${originalIdx}_${itemIdx}`];
                                      }
                                      if (cat.category === '투두리스트' || cat.category === '학교 수업 과제 일정') {
                                        return !checkedItems[`${memo.id}_${originalIdx}_${itemIdx}`];
                                      }
                                      return true;
                                    }).length}개 항목`
                                }
                              </span>
                            </div>

                            {/* 항목 리스트 - showCompletedOnly에 따라 필터링 */}
                            {summaryItems.length > 0 ? (
                              <div className="space-y-1.5">
                                {summaryItems
                                  .map((item: string, itemIdx: number) => ({ item, itemIdx }))
                                  .filter(({ itemIdx }: { itemIdx: number }) => {
                                    const itemKey = `${memo.id}_${originalIdx}_${itemIdx}`;
                                    const isChecked = checkedItems[itemKey] || false;
                                    // 완료 필터 모드: 완료된 것만, 일반 모드: 미완료만
                                    // 단, 투두리스트/학교과제만 필터링, 나머지는 항상 표시
                                    if (cat.category === '투두리스트' || cat.category === '학교 수업 과제 일정') {
                                      return showCompletedOnly ? isChecked : !isChecked;
                                    }
                                    // 쇼핑리스트도 완료 필터에서 장바구니 담은 것만 표시
                                    if (cat.category === '쇼핑리스트') {
                                      const isInCart = cartItems[`${memo.id}_${originalIdx}_${itemIdx}`] || false;
                                      return showCompletedOnly ? isInCart : !isInCart;
                                    }
                                    // 아이디어도 체크박스로 완료 처리
                                    if (cat.category === '아이디어') {
                                      const isChecked = checkedItems[`${memo.id}_${originalIdx}_${itemIdx}`] || false;
                                      return showCompletedOnly ? isChecked : !isChecked;
                                    }
                                    // 나머지 카테고리는 완료 필터에서 표시 안함
                                    return !showCompletedOnly;
                                  })
                                  .map(({ item, itemIdx }: { item: string; itemIdx: number }) => {
                                  const itemKey = `${memo.id}_${originalIdx}_${itemIdx}`;
                                  
                                  // 투두리스트: 체크박스 스타일
                                  if (cat.category === '투두리스트') {
                                    const isChecked = checkedItems[itemKey] || false;
                                    return (
                                      <div 
                                        key={itemIdx} 
                                        className={`flex items-center space-x-3 py-2 px-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                                          isChecked 
                                            ? 'bg-blue-50 border border-blue-200' 
                                            : 'bg-white/80 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50'
                                        }`}
                                        onClick={() => toggleTodoItem(itemKey)}
                                      >
                                        <div className={`p-1 rounded-lg transition-all duration-200 ${
                                          isChecked ? 'bg-blue-100' : 'bg-gray-50 group-hover:bg-blue-100'
                                        }`}>
                                          {isChecked ? (
                                            <Check className="h-4 w-4 stroke-[1.5] text-blue-600" />
                                          ) : (
                                            <Square className="h-4 w-4 stroke-[1.5] text-gray-400 group-hover:text-blue-400" />
                                          )}
                                        </div>
                                        <span className={`text-sm font-light transition-all duration-200 flex-1 ${
                                          isChecked 
                                            ? 'text-blue-600 line-through' 
                                            : 'text-gray-700'
                                        }`}>
                                          {item}
                                        </span>
                                        {isChecked && (
                                          <span className="text-xs text-blue-500 font-medium">✓ 완료</span>
                                        )}
                                      </div>
                                    );
                                  }

                                  // 쇼핑리스트: 장바구니 스타일
                                  if (cat.category === '쇼핑리스트') {
                                    const isInCart = cartItems[itemKey] || false;
                                    return (
                                      <div 
                                        key={itemIdx} 
                                        className={`flex items-center justify-between py-2 px-3 rounded-xl transition-all duration-200 group ${
                                          isInCart 
                                            ? 'bg-emerald-50 border border-emerald-200' 
                                            : 'bg-white/80 border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                                            isInCart ? 'bg-emerald-100' : 'bg-gray-50 group-hover:bg-emerald-100'
                                          }`}>
                                            <ShoppingCart className={`h-3.5 w-3.5 stroke-[1.5] transition-colors duration-200 ${
                                              isInCart ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'
                                            }`} />
                                          </div>
                                          <span className={`text-sm font-light transition-all duration-200 ${
                                            isInCart 
                                              ? 'text-emerald-700 line-through' 
                                              : 'text-gray-700'
                                          }`}>
                                            {item}
                                          </span>
                                        </div>
                                        <Button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleCartItem(itemKey);
                                          }}
                                          variant="ghost"
                                          size="sm"
                                          className={`h-8 px-3 text-xs font-medium rounded-lg transition-all duration-200 ${
                                            isInCart 
                                              ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200' 
                                              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm hover:shadow'
                                          }`}
                                        >
                                          {isInCart ? '✓ 담음' : '🛒 담기'}
                                        </Button>
                                      </div>
                                    );
                                  }

                                  // 학교 수업 과제 일정: 체크박스 + 캘린더 스타일
                                  if (cat.category === '학교 수업 과제 일정') {
                                    const isChecked = checkedItems[itemKey] || false;
                                    const calendarInfo = parseAppointmentForCalendar(item);
                                    return (
                                      <div 
                                        key={itemIdx} 
                                        className={`py-2 px-3 rounded-xl transition-all duration-200 group ${
                                          isChecked 
                                            ? 'bg-orange-50 border border-orange-200' 
                                            : 'bg-white/80 border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50'
                                        }`}
                                      >
                                        <div 
                                          className="flex items-start justify-between cursor-pointer"
                                          onClick={() => toggleTodoItem(itemKey)}
                                        >
                                          <div className="flex items-start space-x-3 flex-1">
                                            <div className={`p-1 rounded-lg transition-all duration-200 mt-0.5 ${
                                              isChecked ? 'bg-orange-100' : 'bg-gray-50 group-hover:bg-orange-100'
                                            }`}>
                                              {isChecked ? (
                                                <Check className="h-4 w-4 stroke-[1.5] text-orange-600" />
                                              ) : (
                                                <Square className="h-4 w-4 stroke-[1.5] text-gray-400 group-hover:text-orange-400" />
                                              )}
                                            </div>
                                            <span className={`text-sm font-light transition-all duration-200 ${
                                              isChecked 
                                                ? 'text-orange-600 line-through' 
                                                : 'text-gray-700'
                                            }`}>
                                              {item}
                                            </span>
                                          </div>
                                          {isChecked && (
                                            <span className="text-xs text-orange-500 font-medium ml-2 flex-shrink-0">✓ 완료</span>
                                          )}
                                        </div>
                                        {!isChecked && calendarInfo.calendarUrl && (
                                          <div className="flex items-center mt-2 ml-9">
                                            <Button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(calendarInfo.calendarUrl!, '_blank');
                                              }}
                                              variant="outline"
                                              size="sm"
                                              className="h-7 px-3 text-xs font-medium rounded-lg border-orange-200 text-orange-600 hover:bg-orange-100 transition-all duration-200"
                                            >
                                              📅 캘린더 추가
                                              <ExternalLink size={10} className="ml-1 stroke-[1.5]" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  // 약속 일정: 캘린더 추가 버튼
                                  if (cat.category === '약속 일정') {
                                    const calendarInfo = parseAppointmentForCalendar(item);
                                    return (
                                      <div key={itemIdx} className="py-2 px-3 bg-white/80 border border-gray-100 rounded-xl hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group">
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-start space-x-3 flex-1">
                                            <div className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-purple-100 transition-all duration-200">
                                              <Calendar className="h-3.5 w-3.5 stroke-[1.5] text-gray-400 group-hover:text-purple-500 transition-colors duration-200" />
                                            </div>
                                            <span className="text-sm font-light text-gray-700">{item}</span>
                                          </div>
                                          {calendarInfo.calendarUrl && (
                                            <Button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(calendarInfo.calendarUrl!, '_blank');
                                              }}
                                              variant="outline"
                                              size="sm"
                                              className="h-8 px-3 text-xs font-medium rounded-lg border-purple-200 text-purple-600 hover:bg-purple-100 transition-all duration-200 ml-2 flex-shrink-0"
                                            >
                                              📅 캘린더 추가
                                              <ExternalLink size={10} className="ml-1 stroke-[1.5]" />
                                            </Button>
                                          )}
                                        </div>
                                        {calendarInfo.startDate && (
                                          <div className="flex items-center space-x-2 mt-2 ml-9 text-xs text-purple-600">
                                            <Calendar className="h-3 w-3 stroke-[1.5]" />
                                            <span className="font-light">마감: {format(calendarInfo.startDate, 'yyyy년 M월 d일 HH:mm', { locale: ko })}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  // 아이디어: 체크박스 + 완료 버튼
                                  if (cat.category === '아이디어') {
                                    const isChecked = checkedItems[itemKey] || false;
                                    return (
                                      <div 
                                        key={itemIdx} 
                                        className={`flex items-start space-x-3 py-2 px-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                                          isChecked 
                                            ? 'bg-amber-50 border border-amber-200' 
                                            : 'bg-white/80 border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50'
                                        }`}
                                        onClick={() => toggleTodoItem(itemKey)}
                                      >
                                        <div className={`p-1 rounded-lg transition-all duration-200 mt-0.5 ${
                                          isChecked ? 'bg-amber-100' : 'bg-gray-50 group-hover:bg-amber-100'
                                        }`}>
                                          {isChecked ? (
                                            <Check className="h-4 w-4 stroke-[1.5] text-amber-600" />
                                          ) : (
                                            <Square className="h-4 w-4 stroke-[1.5] text-gray-400 group-hover:text-amber-400" />
                                          )}
                                        </div>
                                        <span className={`text-sm font-light transition-all duration-200 flex-1 ${
                                          isChecked 
                                            ? 'text-amber-600 line-through' 
                                            : 'text-gray-700'
                                        }`}>
                                          {item}
                                        </span>
                                        {isChecked && (
                                          <span className="text-xs text-amber-500 font-medium flex-shrink-0">✓ 완료</span>
                                        )}
                                      </div>
                                    );
                                  }

                                  // 기타
                                  return (
                                    <div key={itemIdx} className="flex items-start space-x-3 py-2 px-3 bg-white/80 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all duration-200">
                                      <div className="p-1.5 rounded-lg bg-gray-50">
                                        <MoreHorizontal className="h-3.5 w-3.5 stroke-[1.5] text-gray-400" />
                                      </div>
                                      <span className="text-sm font-light text-gray-700">{item}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">{cat.summary}</p>
                            )}

                            {/* 아이디어 카테고리: AI 보충 의견 - 모든 아이디어가 완료되면 함께 이동 */}
                            {cat.category === '아이디어' && cat.ai_supplement && (() => {
                              // 모든 아이디어 항목이 완료되었는지 확인
                              const allItemsCompleted = summaryItems.length > 0 && 
                                summaryItems.every((_: string, itemIdx: number) => 
                                  checkedItems[`${memo.id}_${originalIdx}_${itemIdx}`]
                                );
                              // 완료 모드: 모든 항목 완료시에만 AI 의견 표시
                              // 일반 모드: 하나라도 미완료일 때 AI 의견 표시
                              const shouldShowAI = showCompletedOnly ? allItemsCompleted : !allItemsCompleted;
                              
                              return shouldShowAI ? (
                                <div className="mt-3 pt-3 border-t border-amber-200/60">
                                  <div className="flex items-start space-x-3 p-3 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 rounded-xl border border-amber-100">
                                    <div className="p-1.5 rounded-lg bg-amber-100">
                                      <Lightbulb className="h-4 w-4 stroke-[1.5] text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                      <span className="text-xs font-medium text-amber-700">Gemini AI 의견</span>
                                      <p className="text-sm font-light text-amber-800 mt-1 leading-relaxed">{cat.ai_supplement}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* 기존 요약/전사 텍스트 미리보기 (allCategories가 없는 경우) */
                    (memo.summary || memo.transcription) && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-md">
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {memo.summary || memo.transcription}
                        </p>
                        
                        {/* 날짜/시간이 포함된 모든 메모에 캘린더 버튼 표시 */}
                        {(() => {
                          const calendarInfo = parseAppointmentForCalendar(memo.summary || memo.transcription || '');
                          return calendarInfo.calendarUrl ? (
                            <div className="mt-2 flex items-center gap-2">
                              {calendarInfo.startDate && (
                                <span className="text-xs text-purple-600">
                                  📅 {format(calendarInfo.startDate, 'M월 d일 HH:mm', { locale: ko })}
                                </span>
                              )}
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(calendarInfo.calendarUrl!, '_blank');
                                }}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                              >
                                <Calendar size={12} className="mr-1" />
                                캘린더 추가
                                <ExternalLink size={10} className="ml-1" />
                              </Button>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    )
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

