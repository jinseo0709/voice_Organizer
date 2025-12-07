'use client';

// FIREBASE 초기화 강제 실행 (최우선)
import '@/lib/firebase';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceProcessor, VoiceProcessingResult } from '@/components/audio/VoiceProcessor';
import { VoiceMemoList, CheckedItemsState, CartItemsState } from '@/components/voice/VoiceMemoList';
import { CalendarView } from '@/components/calendar/CalendarView';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreService } from '@voice-organizer/firebase';
import type { VoiceMemo } from '@voice-organizer/shared';
import {
  Mic,
  FileText,
  Filter,
  Search,
  Calendar,
  CalendarDays,
  CheckSquare,
  ShoppingCart,
  GraduationCap,
  Lightbulb,
  MoreHorizontal,
  List,
  Loader2,
  RefreshCw,
  LogOut,
  User as UserIcon,
  CheckCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 카테고리별 아이콘 매핑
const CATEGORY_CONFIG = {
  '쇼핑리스트': { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-300' },
  '투두리스트': { icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300' },
  '약속 일정': { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-300' },
  '학교 수업 과제 일정': { icon: GraduationCap, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300' },
  '아이디어': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-300' },
  '기타': { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-300' }
};

export default function VoiceOrganizerApp() {
  const { user, signOut, isFirebaseAuth } = useAuth();
  const [results, setResults] = useState<VoiceProcessingResult[]>([]);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<VoiceProcessingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false);
  const [checkedItems, setCheckedItems] = useState<CheckedItemsState>({});
  const [cartItems, setCartItems] = useState<CartItemsState>({});

  // Firestore에서 메모 목록 불러오기
  const loadMemos = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('📂 Loading memos from Firestore for user:', user.id);
      const userMemos = await firestoreService.getUserMemos(user.id);
      console.log('✅ Loaded memos:', userMemos.length);
      setMemos(userMemos);
    } catch (error) {
      console.error('❌ Failed to load memos:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 실시간 메모 구독
  useEffect(() => {
    if (!user) {
      setMemos([]);
      setLoading(false);
      return;
    }

    console.log('🔄 Setting up real-time memo subscription...');
    setLoading(true);

    const unsubscribe = firestoreService.subscribeToUserMemos(
      user.id,
      (updatedMemos) => {
        console.log('📬 Real-time update received:', updatedMemos.length, 'memos');
        setMemos(updatedMemos);
        setLoading(false);
      }
    );

    return () => {
      console.log('🛑 Unsubscribing from memo updates');
      unsubscribe();
    };
  }, [user]);

  // 처리 완료 핸들러
  const handleProcessingComplete = (result: VoiceProcessingResult) => {
    setResults(prev => [result, ...prev]);
    setCurrentResult(result);
    // 실시간 구독이 새 메모를 자동으로 가져올 것이므로 별도 로드 불필요
  };

  // 메모 삭제 핸들러
  const handleDeleteMemo = async (memoId: string) => {
    try {
      console.log('🗑️ Deleting memo:', memoId);
      await firestoreService.deleteMemo(memoId);
      console.log('✅ Memo deleted successfully');
      // 실시간 구독이 자동으로 목록 업데이트
    } catch (error) {
      console.error('❌ Failed to delete memo:', error);
    }
  };

  // 메모 다운로드 핸들러
  const handleDownloadMemo = (memo: VoiceMemo) => {
    if (memo.audioUrl) {
      const link = document.createElement('a');
      link.href = memo.audioUrl;
      link.download = `${memo.title || 'voice_memo'}.m4a`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 에러 핸들러
  const handleError = (error: string) => {
    console.error('Processing error:', error);
  };

  // 로그아웃 핸들러
  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // 결과 필터링
  const filteredResults = results.filter(result => {
    const matchesCategory = selectedCategory === 'all' || result.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      result.originalText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  // 메모가 완료된 항목을 가지고 있는지 확인하는 헬퍼 함수 (투두 + 쇼핑)
  const memoHasCompletedItems = (memo: VoiceMemo): boolean => {
    // checkedItems(투두)에서 해당 메모의 체크된 항목이 있는지 확인
    const hasCheckedTodo = Object.keys(checkedItems).some(key => 
      key.startsWith(`${memo.id}_`) && checkedItems[key]
    );
    // cartItems(쇼핑)에서 해당 메모의 담긴 항목이 있는지 확인
    const hasCartItem = Object.keys(cartItems).some(key => 
      key.startsWith(`${memo.id}_`) && cartItems[key]
    );
    return hasCheckedTodo || hasCartItem;
  };

  // 메모가 미완료 항목을 가지고 있는지 확인하는 헬퍼 함수 (투두 + 쇼핑 + 아이디어)
  const memoHasIncompleteItems = (memo: VoiceMemo): boolean => {
    let hasIncomplete = false;
    let hasCompletableCategory = false;
    
    memo.allCategories?.forEach((cat: { category: string; summary_list?: string[] }, catIdx: number) => {
      // 투두리스트, 학교 과제, 아이디어: checkedItems로 체크
      if ((cat.category === '투두리스트' || cat.category === '학교 수업 과제 일정' || cat.category === '아이디어') && cat.summary_list) {
        hasCompletableCategory = true;
        cat.summary_list.forEach((_, itemIdx: number) => {
          const key = `${memo.id}_${catIdx}_${itemIdx}`;
          if (!checkedItems[key]) {
            hasIncomplete = true;
          }
        });
      }
      // 쇼핑리스트: cartItems로 체크
      if (cat.category === '쇼핑리스트' && cat.summary_list) {
        hasCompletableCategory = true;
        cat.summary_list.forEach((_, itemIdx: number) => {
          const key = `${memo.id}_${catIdx}_${itemIdx}`;
          if (!cartItems[key]) {
            hasIncomplete = true;
          }
        });
      }
    });
    
    // 완료 가능한 카테고리가 없으면 일반 표시
    if (!hasCompletableCategory) return true;
    
    return hasIncomplete;
  };

  // 메모 필터링 (allCategories 기반 - 하나의 메모가 여러 카테고리에 포함될 수 있음)
  const filteredMemos = memos.filter(memo => {
    // 완료된 항목 필터가 활성화된 경우 - 완료된 항목이 있는 메모만 표시
    if (showCompletedOnly) {
      const hasCompleted = memoHasCompletedItems(memo);
      if (!hasCompleted) return false;
      
      const matchesSearch = searchQuery === '' ||
        (memo.transcription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memo.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memo.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memo.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    }
    
    // 일반 필터 - 미완료 항목이 있는 메모만 표시
    const hasIncomplete = memoHasIncompleteItems(memo);
    if (!hasIncomplete) return false;
    
    // 'all'이면 모든 메모 표시
    if (selectedCategory === 'all') {
      const matchesSearch = searchQuery === '' ||
        (memo.transcription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memo.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memo.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (memo.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    }
    
    // allCategories 배열에서 선택된 카테고리가 있는지 확인
    const hasCategory = memo.allCategories?.some(
      (cat: { category: string }) => cat.category === selectedCategory
    ) || memo.category === selectedCategory;
    
    const matchesSearch = searchQuery === '' ||
      (memo.transcription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return hasCategory && matchesSearch;
  });

  // 카테고리별 통계 (미완료 항목이 있는 메모만 카운트)
  const categoryStats = Object.keys(CATEGORY_CONFIG).reduce((acc, category) => {
    acc[category] = memos.filter(m => {
      // 미완료 항목이 없으면 제외
      if (!memoHasIncompleteItems(m)) return false;
      return m.allCategories?.some((cat: { category: string }) => cat.category === category) || 
        m.category === category;
    }).length;
    return acc;
  }, {} as Record<string, number>);

  // 완료된 개별 항목 개수 카운트 (투두 + 쇼핑)
  const completedItemCount = 
    Object.values(checkedItems).filter(Boolean).length + 
    Object.values(cartItems).filter(Boolean).length;

  // JSON으로 데이터 내보내기
  const exportData = () => {
    const dataStr = JSON.stringify(filteredResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voice_memos_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Card className="w-full max-w-md shadow-sm border border-gray-100 bg-white">
          <CardContent className="text-center py-12 px-8">
            <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mic className="h-8 w-8 text-teal-600 stroke-[1.5]" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Voice Organizer
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed font-light">
              음성 메모를 텍스트로 변환하고<br />AI가 스마트하게 분류해드립니다.
            </p>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-medium transition-all duration-200"
            >
              로그인하여 시작하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* 헤더 - 전체 배경에 은은한 파형 */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100/80 sticky top-0 z-50 relative overflow-hidden">
        {/* Voice Waveform 전체 배경 */}
        <div className="header-wave-bg">
          <div className="voice-wave-full">
            {[...Array(80)].map((_, i) => (
              <div
                key={i}
                className="wave-bar-bg"
                style={{
                  height: `${15 + Math.sin(i * 0.3) * 25 + Math.random() * 20}%`,
                  animationDelay: `${i * 0.08}s`,
                }}
              />
            ))}
          </div>
          <div className="wave-shimmer-full" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-4 relative z-10">
          <div className="flex items-center justify-between">
            {/* 로고 */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                <Mic className="h-5 w-5 text-white stroke-[1.5]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-800 tracking-tight">Voice Organizer</h1>
              </div>
            </div>
            
            {/* 사용자 프로필 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-full pl-1 pr-4 py-1 border border-gray-100/80 shadow-sm">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '사용자'}
                    className="h-8 w-8 rounded-full ring-2 ring-white"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-teal-600 stroke-[1.5]" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-600 hidden sm:block">
                  {user.displayName || user.email?.split('@')[0] || '사용자'}
                </span>
              </div>

              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-red-500 hover:bg-red-50/80 rounded-full backdrop-blur-sm"
              >
                <LogOut className="h-4 w-4 stroke-[1.5]" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* 탭 네비게이션 - 순서: 새 녹음, 메모, 검색창, 캘린더 */}
        <div className="mb-8">
          <div className="w-full flex flex-wrap items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
            {/* 1순위: 새 녹음 */}
            <button
              onClick={() => setActiveTab('upload')}
              className={`group flex items-center space-x-2 py-3 px-6 rounded-xl text-base font-medium transition-all duration-200 ${
                activeTab === 'upload'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
              }`}
            >
              <Mic className={`h-5 w-5 stroke-[1.5] transition-transform duration-200 ${activeTab === 'upload' ? 'animate-pulse' : 'group-hover:scale-110'}`} />
              <span>새 녹음</span>
            </button>

            {/* 2순위: 메모 (전체) */}
            <button
              onClick={() => { setActiveTab('list'); setSelectedCategory('all'); }}
              className={`group flex items-center space-x-2 py-3 px-6 rounded-xl text-base font-medium transition-all duration-200 ${
                activeTab === 'list' && selectedCategory === 'all'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
              }`}
            >
              <List className={`h-5 w-5 stroke-[1.5] transition-transform duration-200 group-hover:scale-110`} />
              <span>메모</span>
              {memos.length > 0 && (
                <span className={`ml-1 px-2.5 py-1 text-sm rounded-full transition-all duration-200 ${
                  activeTab === 'list' && selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'
                }`}>
                  {memos.length}
                </span>
              )}
            </button>

            {/* 3순위: 검색창 - flex-1로 남은 공간 차지 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 stroke-[1.5]" />
              <input
                type="text"
                placeholder="메모 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white transition-all font-light"
              />
            </div>

            {/* 4순위: 캘린더 */}
            <button
              onClick={() => setActiveTab('calendar')}
              className={`group flex items-center space-x-2 py-3 px-6 rounded-xl text-base font-medium transition-all duration-200 ${
                activeTab === 'calendar'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
              }`}
            >
              <CalendarDays className={`h-5 w-5 stroke-[1.5] transition-all duration-200 group-hover:scale-110`} />
              <span>캘린더</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 사이드바 (좌측) - 카테고리 필터 중심 */}
          <aside className="lg:col-span-1 space-y-4 order-2 lg:order-1">
            {/* 카테고리 필터 카드 */}
            <Card className="border border-gray-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-teal-600 stroke-[1.5]" />
                  <span>카테고리 필터</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-2">
                {/* 전체 메모 */}
                <button
                  onClick={() => { setSelectedCategory('all'); setActiveTab('list'); setShowCompletedOnly(false); }}
                  className={`sidebar-btn w-full flex items-center justify-between p-3 rounded-xl mb-2 transition-all duration-200 group ${
                    selectedCategory === 'all' && activeTab === 'list' && !showCompletedOnly
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-gray-50/80 text-gray-700 hover:bg-teal-50 border border-transparent hover:border-teal-200/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`sidebar-icon-wrapper ${
                      selectedCategory === 'all' && activeTab === 'list' && !showCompletedOnly ? 'bg-white/20' : 'bg-teal-50 group-hover:bg-teal-100'
                    }`}>
                      <FileText className={`sidebar-icon h-4 w-4 ${
                        selectedCategory === 'all' && activeTab === 'list' && !showCompletedOnly ? 'text-white' : 'text-teal-600'
                      }`} />
                    </div>
                    <span className="font-medium">전체 메모</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedCategory === 'all' && activeTab === 'list' && !showCompletedOnly
                      ? 'bg-white/20 text-white'
                      : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'
                  }`}>
                    {memos.length}
                  </span>
                </button>

                {/* 구분선 */}
                <div className="border-t border-gray-100 my-3" />

                {/* 완료된 항목 필터 */}
                <button
                  onClick={() => { 
                    setShowCompletedOnly(!showCompletedOnly); 
                    setSelectedCategory('all'); 
                    setActiveTab('list'); 
                  }}
                  className={`sidebar-btn w-full flex items-center justify-between p-3 rounded-xl mb-3 transition-all duration-200 group ${
                    showCompletedOnly
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 border border-emerald-100/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`sidebar-icon-wrapper ${
                      showCompletedOnly ? 'bg-white/20' : 'bg-emerald-100 group-hover:bg-emerald-200'
                    }`}>
                      <CheckCircle className={`sidebar-icon h-4 w-4 ${
                        showCompletedOnly ? 'text-white' : 'text-emerald-600'
                      }`} />
                    </div>
                    <span className="font-medium text-sm">✅ 완료된 항목</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-sm font-semibold transition-all duration-200 ${
                    showCompletedOnly
                      ? 'bg-white/20 text-white'
                      : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'
                  }`}>
                    {completedItemCount}
                  </span>
                </button>

                {/* 구분선 */}
                <div className="border-t border-gray-100 my-3" />

                {/* 카테고리 목록 */}
                <div className="space-y-1">
                  {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                    const IconComponent = config.icon;
                    const count = categoryStats[category] || 0;
                    const isSelected = selectedCategory === category && activeTab === 'list' && !showCompletedOnly;

                    return (
                      <button
                        key={category}
                        onClick={() => { setSelectedCategory(category); setActiveTab('list'); setShowCompletedOnly(false); }}
                        className={`sidebar-btn w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group ${
                          isSelected
                            ? `${config.bg} border ${config.border || 'border-current'} shadow-sm`
                            : 'hover:bg-gray-50/80 border border-transparent hover:border-gray-200/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`sidebar-icon-wrapper w-8 h-8 ${isSelected ? 'bg-white/60' : `${config.bg} group-hover:scale-105`}`}>
                            <IconComponent className={`sidebar-icon h-4 w-4 ${config.color}`} />
                          </div>
                          <span className={`text-sm font-medium transition-colors duration-200 ${
                            isSelected ? config.color : 'text-gray-600 group-hover:text-gray-800'
                          }`}>
                            {category}
                          </span>
                        </div>
                        <span className={`min-w-[28px] px-2 py-0.5 rounded-full text-xs font-semibold text-center transition-all duration-200 ${
                          isSelected
                            ? `${config.bg} ${config.color}`
                            : count > 0 
                              ? 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* 빠른 통계 */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-500 to-teal-600 text-white">
              <CardContent className="py-4">
                <div className="text-center">
                  <p className="text-teal-100 text-xs mb-1 font-light">총 저장된 메모</p>
                  <p className="text-3xl font-semibold">{memos.length}</p>
                  <p className="text-teal-200 text-xs mt-2 font-light">
                    {Object.values(categoryStats).filter(c => c > 0).length}개 카테고리 사용 중
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* 메인 컨텐츠 영역 (우측) */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {activeTab === 'upload' ? (
              <div className="space-y-6">
                {/* 음성 처리기 */}
                <VoiceProcessor
                  onProcessingComplete={handleProcessingComplete}
                  onError={handleError}
                />

                {/* 최근 결과 */}
                {currentResult && (
                  <Card className="border border-gray-100 shadow-sm bg-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-700">최근 처리 결과</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {(() => {
                          const config = CATEGORY_CONFIG[currentResult.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG['기타'];
                          const IconComponent = config.icon;
                          return (
                            <div className={`p-3 rounded-xl ${config.bg}`}>
                              <IconComponent className={`h-6 w-6 stroke-[1.5] ${config.color}`} />
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800">{currentResult.category}</p>
                          <p className="text-sm text-gray-500 truncate font-light">
                            {currentResult.summary}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : activeTab === 'list' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {selectedCategory === 'all' ? '전체 메모' : selectedCategory}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({filteredMemos.length}개)
                    </span>
                  </h2>
                  <Button
                    onClick={loadMemos}
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                    className="text-gray-500 hover:text-teal-600 hover:bg-teal-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 stroke-[1.5] ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-teal-500 mx-auto mb-4 stroke-[1.5]" />
                      <span className="text-gray-500 font-light">메모를 불러오는 중...</span>
                    </div>
                  </div>
                ) : (
                  <VoiceMemoList
                    memos={filteredMemos}
                    onDelete={handleDeleteMemo}
                    onDownload={handleDownloadMemo}
                    loading={false}
                    selectedCategory={selectedCategory}
                    checkedItems={checkedItems}
                    onCheckedItemsChange={setCheckedItems}
                    cartItems={cartItems}
                    onCartItemsChange={setCartItems}
                    showCompletedOnly={showCompletedOnly}
                  />
                )}
              </div>
            ) : (
              <CalendarView memos={memos} />
            )}
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400 font-light">
              © 2025 Voice Organizer. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-gray-400 hover:text-teal-600 transition-colors font-light">
                이용약관
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-teal-600 transition-colors font-light">
                개인정보 처리방침
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}