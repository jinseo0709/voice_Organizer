'use client';

// FIREBASE 초기화 강제 실행 (최우선)
import '@/lib/firebase';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VoiceProcessor, VoiceProcessingResult } from '@/components/audio/VoiceProcessor';
import { useAuth } from '@/contexts/AuthContext';
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
  MoreHorizontal
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
  const { user } = useAuth();
  const [results, setResults] = useState<VoiceProcessingResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<VoiceProcessingResult | null>(null);


  // 처리 완료 핸들러
  const handleProcessingComplete = (result: VoiceProcessingResult) => {
    setResults(prev => [result, ...prev]);
    setCurrentResult(result);
  };

  // 에러 핸들러
  const handleError = (error: string) => {
    console.error('Processing error:', error);
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

  // 카테고리별 통계
  const categoryStats = Object.keys(CATEGORY_CONFIG).reduce((acc, category) => {
    acc[category] = results.filter(r => r.category === category).length;
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
              <span className="text-sm text-gray-600">
                안녕하세요, {user.displayName || user.email}님
              </span>
              <Button
                onClick={exportData}
                variant="outline"
                size="sm"
                disabled={filteredResults.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                내보내기
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 컨텐츠 */}
          <div className="lg:col-span-2 space-y-8">
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
                    <span className="font-semibold">{results.length}</span>
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
            {results.length > 0 && (
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
                      {filteredResults.slice(0, 10).map((result) => {
                        const config = CATEGORY_CONFIG[result.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG['기타'];
                        const IconComponent = config.icon;
                        
                        return (
                          <div 
                            key={result.id} 
                            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => setCurrentResult(result)}
                          >
                            <div className={`p-1 rounded ${config.bg}`}>
                              <IconComponent className={`h-4 w-4 ${config.color}`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {result.category}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {result.summary}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDistanceToNow(result.createdAt, { addSuffix: true, locale: ko })}
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