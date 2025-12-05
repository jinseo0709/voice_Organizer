'use client';

// FIREBASE 초기화 강제 실행 (최우선)
import '@/lib/firebase';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceProcessor, VoiceProcessingResult } from '@/components/audio/VoiceProcessor';
import { VoiceMemoList } from '@/components/voice/VoiceMemoList';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreService } from '@voice-organizer/firebase';
import type { VoiceMemo } from '@voice-organizer/shared';
import {
  Mic,
  FileText,
  Clock,
  Filter,
  Search,
  Download,
  Calendar,
  CheckSquare,
  ShoppingCart,
  GraduationCap,
  Lightbulb,
  MoreHorizontal,
  List,
  Loader2,
  RefreshCw,
  LogOut,
  Shield,
  User as UserIcon
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

// 카테고리별 아이콘 매핑
const CATEGORY_CONFIG = {
  '쇼핑리스트': { icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
  '투두리스트': { icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
  '약속 일정': { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
  '학교 수업 과제 일정': { icon: GraduationCap, color: 'text-orange-600', bg: 'bg-orange-50' },
  '아이디어': { icon: Lightbulb, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  '기타': { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-50' }
};

export default function VoiceOrganizerApp() {
  const { user, signOut, isFirebaseAuth } = useAuth();
  const [results, setResults] = useState<VoiceProcessingResult[]>([]);
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<VoiceProcessingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'list'>('upload');

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

  // 메모 필터링
  const filteredMemos = memos.filter(memo => {
    const matchesCategory = selectedCategory === 'all' || memo.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      (memo.transcription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memo.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // 카테고리별 통계 (Firestore 메모 기준)
  const categoryStats = Object.keys(CATEGORY_CONFIG).reduce((acc, category) => {
    acc[category] = memos.filter(m => m.category === category).length;
    return acc;
  }, {} as Record<string, number>);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Mic className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Voice Organizer
            </h2>
            <p className="text-gray-600 mb-4">
              음성 메모를 텍스트로 변환하고 스마트하게 분류해보세요.
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              로그인하여 시작하기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mic className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Voice Organizer</h1>
                <p className="text-sm text-gray-500">음성을 텍스트로, 텍스트를 인사이트로</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 사용자 정보 */}
              <div className="flex items-center space-x-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || '사용자'}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName || user.email?.split('@')[0] || '사용자'}
                  </p>
                  <div className="flex items-center space-x-1">
                    {isFirebaseAuth ? (
                      <span className="text-xs text-green-600 flex items-center">
                        <Shield className="h-3 w-3 mr-0.5" />
                        Firebase
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-600">데모 모드</span>
                    )}
                    {user.isAnonymous && (
                      <span className="text-xs text-gray-500">(게스트)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 내보내기 버튼 */}
              <Button
                onClick={exportData}
                variant="outline"
                size="sm"
                disabled={filteredResults.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">내보내기</span>
              </Button>

              {/* 로그아웃 버튼 */}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">로그아웃</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 탭 네비게이션 */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mic className="h-4 w-4" />
                <span>새 녹음</span>
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-4 w-4" />
                <span>메모 목록</span>
                {memos.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
                    {memos.length}
                  </span>
                )}
              </button>
            </div>

            {/* 탭 컨텐츠 */}
            {activeTab === 'upload' ? (
              <div className="space-y-6">
                {/* 음성 처리기 */}
                <VoiceProcessor
                  onProcessingComplete={handleProcessingComplete}
                  onError={handleError}
                />

                {/* 최근 결과 */}
                {currentResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle>최근 처리 결과</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          {(() => {
                            const config = CATEGORY_CONFIG[currentResult.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG['기타'];
                            const IconComponent = config.icon;
                            return (
                              <div className={`p-2 rounded-lg ${config.bg}`}>
                                <IconComponent className={`h-5 w-5 ${config.color}`} />
                              </div>
                            );
                          })()}
                          <div>
                            <p className="font-medium">{currentResult.category}</p>
                            <p className="text-sm text-gray-500">
                              {formatDistanceToNow(currentResult.createdAt, { addSuffix: true, locale: ko })}
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-800 line-clamp-3">
                            {currentResult.summary}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 메모 목록 헤더 */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    저장된 메모 ({filteredMemos.length})
                  </h2>
                  <Button
                    onClick={loadMemos}
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>

                {/* 메모 목록 */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-3 text-gray-600">메모를 불러오는 중...</span>
                  </div>
                ) : (
                  <VoiceMemoList
                    memos={filteredMemos}
                    onDelete={handleDeleteMemo}
                    onDownload={handleDownloadMemo}
                    loading={false}
                  />
                )}
              </div>
            )}
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 통계 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>처리 통계</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">전체 메모</span>
                    <span className="font-semibold">{memos.length}</span>
                  </div>

                  {Object.entries(categoryStats).map(([category, count]) => {
                    if (count === 0) return null;
                    const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                    const IconComponent = config.icon;

                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`h-4 w-4 ${config.color}`} />
                          <span className="text-sm text-gray-600">{category}</span>
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 필터 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>필터</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 검색 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 카테고리 필터 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">카테고리</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">전체</option>
                    {Object.keys(CATEGORY_CONFIG).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* 최근 기록 */}
            {memos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>최근 기록</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 overflow-auto">
                    <div className="space-y-3">
                      {filteredMemos.slice(0, 10).map((memo) => {
                        const config = CATEGORY_CONFIG[memo.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG['기타'];
                        const IconComponent = config.icon;

                        return (
                          <div
                            key={memo.id}
                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => setActiveTab('list')}
                          >
                            <div className={`p-1 rounded ${config.bg}`}>
                              <IconComponent className={`h-4 w-4 ${config.color}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {memo.title || memo.category || '음성 메모'}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {memo.summary || memo.transcription || ''}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(memo.createdAt, { addSuffix: true, locale: ko })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}