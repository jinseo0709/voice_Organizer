'use client';

import React, { useState } from 'react';
import { VoiceProcessingResult } from './VoiceProcessor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Tag, 
  Clock, 
  TrendingUp, 
  Hash, 
  Play, 
  Pause,
  Download,
  Share2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow, format, parse, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ProcessingResultsProps {
  result: VoiceProcessingResult;
}

// 카테고리별 아이콘 매핑
const CATEGORY_ICONS = {
  '쇼핑리스트': '🛒',
  '투두리스트': '✅', 
  '약속 일정': '📅',
  '학교 수업 과제 일정': '🎓',
  '아이디어': '💡',
  '기타': '📝'
};

// 카테고리별 색상 매핑
const CATEGORY_COLORS = {
  '쇼핑리스트': 'bg-green-100 text-green-800 border-green-200',
  '투두리스트': 'bg-blue-100 text-blue-800 border-blue-200',
  '약속 일정': 'bg-purple-100 text-purple-800 border-purple-200',
  '학교 수업 과제 일정': 'bg-orange-100 text-orange-800 border-orange-200',
  '아이디어': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  '기타': 'bg-gray-100 text-gray-800 border-gray-200'
};

// 🗓️ 약속 일정에서 날짜/시간 파싱 및 Google Calendar URL 생성
function parseAppointmentForCalendar(text: string): { 
  title: string; 
  startDate: Date | null; 
  endDate: Date | null;
  location: string;
  calendarUrl: string | null;
} {
  const now = new Date();
  let startDate: Date | null = null;
  let location = '';
  let title = text;
  
  // 날짜 패턴 매칭
  const datePatterns = [
    // "2025년 12월 7일" 형식
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
    // "12월 7일" 형식 (현재 년도 기준)
    /(\d{1,2})월\s*(\d{1,2})일/,
    // "내일", "모레" 처리
    /(내일|모레|오늘)/,
    // "다음주 월요일" 등
    /(다음주|이번주)\s*(월|화|수|목|금|토|일)요일/
  ];
  
  // 시간 패턴 매칭
  const timePatterns = [
    // "오후 5시", "오전 10시" 형식
    /(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?/,
    // "17:00", "17시" 형식
    /(\d{1,2}):(\d{2})/,
    /(\d{1,2})시(?:\s*(\d{1,2})분)?/
  ];
  
  // 장소 패턴 매칭
  const locationPatterns = [
    /에서\s+(.+?)(?:에서|와|과|랑|이랑|하고|\s|$)/,
    /(\S+(?:역|카페|식당|레스토랑|공원|센터|빌딩|아파트|동|구|로|길))\s*(?:에서|에)/,
    /장소[:\s]*(.+?)(?:에서|$)/
  ];
  
  // 날짜 추출
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('년')) {
        // 2025년 12월 7일 형식
        const year = parseInt(match[1]);
        const month = parseInt(match[2]) - 1;
        const day = parseInt(match[3]);
        startDate = new Date(year, month, day);
      } else if (match[0] === '내일') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 1);
      } else if (match[0] === '모레') {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 2);
      } else if (match[0] === '오늘') {
        startDate = new Date(now);
      } else if (match[0].includes('월')) {
        // 12월 7일 형식
        const month = parseInt(match[1]) - 1;
        const day = parseInt(match[2]);
        startDate = new Date(now.getFullYear(), month, day);
        // 지난 날짜면 내년으로
        if (startDate < now) {
          startDate.setFullYear(startDate.getFullYear() + 1);
        }
      }
      break;
    }
  }
  
  // 시간 추출
  if (startDate) {
    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        let hours = 0;
        let minutes = 0;
        
        if (match[0].includes('오전') || match[0].includes('오후')) {
          hours = parseInt(match[2]);
          minutes = match[3] ? parseInt(match[3]) : 0;
          if (match[1] === '오후' && hours !== 12) {
            hours += 12;
          } else if (match[1] === '오전' && hours === 12) {
            hours = 0;
          }
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
  
  // 제목 정리 (날짜/시간 정보 제거 후 핵심 내용만)
  title = text
    .replace(/\d{4}년\s*\d{1,2}월\s*\d{1,2}일/g, '')
    .replace(/\d{1,2}월\s*\d{1,2}일/g, '')
    .replace(/(오전|오후)\s*\d{1,2}시(\s*\d{1,2}분)?/g, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    .replace(/\d{1,2}시(\s*\d{1,2}분)?/g, '')
    .replace(/(내일|모레|오늘)/g, '')
    .replace(/에서/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (title.length < 5) {
    title = text.slice(0, 50);
  }
  
  // Google Calendar URL 생성
  let calendarUrl: string | null = null;
  if (startDate && isValid(startDate)) {
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1); // 기본 1시간 이벤트
    
    // Google Calendar 형식: YYYYMMDDTHHmmss
    const formatGoogleDate = (date: Date) => {
      return format(date, "yyyyMMdd'T'HHmmss");
    };
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: `음성 메모에서 생성됨: ${text}`,
      ...(location && { location })
    });
    
    calendarUrl = `https://www.google.com/calendar/render?${params.toString()}`;
    
    return { title, startDate, endDate, location, calendarUrl };
  }
  
  return { title, startDate: null, endDate: null, location, calendarUrl: null };
}

export function ProcessingResults({ result }: ProcessingResultsProps) {
  const [showFullText, setShowFullText] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // 감정 점수 해석
  const getSentimentLabel = (score: number) => {
    if (score > 0.25) return { label: '긍정적', color: 'text-green-600', bg: 'bg-green-50' };
    if (score < -0.25) return { label: '부정적', color: 'text-red-600', bg: 'bg-red-50' };
    return { label: '중립적', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  // 신뢰도 표시
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 오디오 재생/정지
  const toggleAudio = () => {
    if (!audioElement) {
      const audio = new Audio(result.audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        console.error('오디오 재생 실패');
        setIsPlaying(false);
      };
      setAudioElement(audio);
      audio.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  // 클립보드 복사
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
    }
  };

  // 파일 다운로드
  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = result.audioUrl;
    link.download = `voice_memo_${result.id}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 공유하기
  const shareResult = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `음성 메모 - ${result.category}`,
          text: result.summary,
          url: window.location.href
        });
      } catch (error) {
        console.log('공유 취소 또는 실패');
      }
    } else {
      // 폴백: 클립보드에 복사
      const shareText = `음성 메모 결과\n카테고리: ${result.category}\n요약: ${result.summary}`;
      await copyToClipboard(shareText, 'share');
    }
  };

  const sentiment = getSentimentLabel(result.sentiment.score);
  const categoryIcon = CATEGORY_ICONS[result.category as keyof typeof CATEGORY_ICONS] || '📝';
  const categoryColor = CATEGORY_COLORS[result.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS['기타'];

  return (
    <div className="space-y-6">
      {/* 헤더 정보 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{categoryIcon}</span>
              <div>
                <CardTitle className="text-xl">
                  분석 결과
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {format(result.createdAt, 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={toggleAudio}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{isPlaying ? '정지' : '재생'}</span>
              </Button>
              
              <Button
                onClick={downloadAudio}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button
                onClick={shareResult}
                variant="outline"
                size="sm"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 카테고리 및 메타 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Tag className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">분류 카테고리</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${categoryColor}`}>
              <span className="mr-1">{categoryIcon}</span>
              {result.category}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              신뢰도: <span className={getConfidenceColor(result.categoryConfidence)}>
                {Math.round(result.categoryConfidence * 100)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">감정 분석</span>
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${sentiment.bg} ${sentiment.color}`}>
              {sentiment.label}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              점수: {result.sentiment.score.toFixed(2)} | 강도: {result.sentiment.magnitude.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">처리 시간</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">
              {(result.processingTime / 1000).toFixed(1)}초
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {formatDistanceToNow(result.createdAt, { addSuffix: true, locale: ko })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 원본 텍스트 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>변환된 원본 텍스트</span>
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowFullText(!showFullText)}
                variant="ghost"
                size="sm"
              >
                {showFullText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="ml-1">{showFullText ? '접기' : '전체 보기'}</span>
              </Button>
              
              <Button
                onClick={() => copyToClipboard(result.originalText, 'original')}
                variant="ghost"
                size="sm"
              >
                {copied === 'original' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {showFullText 
                ? result.originalText 
                : `${result.originalText.slice(0, 200)}${result.originalText.length > 200 ? '...' : ''}`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 카테고리별 요약 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <span className="text-xl">{categoryIcon}</span>
              <span>카테고리별 맞춤형 요약</span>
            </CardTitle>
            
            <Button
              onClick={() => copyToClipboard(result.summary, 'summary')}
              variant="ghost"
              size="sm"
            >
              {copied === 'summary' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="prose prose-sm max-w-none">
              {/* 요약이 | 로 구분된 항목 리스트인 경우 개별 표시 */}
              {result.summary.includes('|') ? (
                <div className="space-y-3">
                  {result.summary.split('|').map((item, index) => {
                    const trimmedItem = item.trim();
                    if (!trimmedItem) return null;
                    
                    // 약속 일정 카테고리인 경우 캘린더 버튼 표시
                    if (result.category === '약속 일정') {
                      const calendarInfo = parseAppointmentForCalendar(trimmedItem);
                      return (
                        <div key={index} className="flex items-start justify-between p-3 bg-white rounded-lg border border-purple-200">
                          <div className="flex-1">
                            <span className="text-gray-800">{trimmedItem}</span>
                            {calendarInfo.startDate && (
                              <div className="mt-1 text-xs text-purple-600">
                                📅 {format(calendarInfo.startDate, 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                                {calendarInfo.location && ` • 📍 ${calendarInfo.location}`}
                              </div>
                            )}
                          </div>
                          {calendarInfo.calendarUrl && (
                            <Button
                              onClick={() => window.open(calendarInfo.calendarUrl!, '_blank')}
                              variant="outline"
                              size="sm"
                              className="ml-3 bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              캘린더 추가
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      );
                    }
                    
                    return (
                      <div key={index} className="flex items-center p-2 bg-white rounded-lg border border-gray-200">
                        <span className="text-gray-500 mr-2">•</span>
                        <span className="text-gray-800">{trimmedItem}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {/* 약속 일정 단일 항목인 경우 */}
                  {result.category === '약속 일정' ? (
                    (() => {
                      const calendarInfo = parseAppointmentForCalendar(result.summary);
                      return (
                        <div className="space-y-3">
                          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                            {result.summary}
                          </div>
                          {calendarInfo.startDate && (
                            <div className="text-xs text-purple-600">
                              📅 {format(calendarInfo.startDate, 'yyyy년 M월 d일 HH:mm', { locale: ko })}
                              {calendarInfo.location && ` • 📍 ${calendarInfo.location}`}
                            </div>
                          )}
                          {calendarInfo.calendarUrl && (
                            <Button
                              onClick={() => window.open(calendarInfo.calendarUrl!, '_blank')}
                              variant="outline"
                              size="sm"
                              className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                            >
                              <Calendar className="h-4 w-4 mr-1" />
                              Google 캘린더에 추가
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {result.summary}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 키워드 및 개체 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 키워드 */}
        {result.keywords.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>주요 키워드</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((keyword, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 개체 */}
        {result.entities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tag className="h-5 w-5" />
                <span>인식된 개체</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.entities.slice(0, 5).map((entity, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{entity.name}</span>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {entity.type}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {Math.round(entity.salience * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 복사 완료 알림 */}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          클립보드에 복사되었습니다!
        </div>
      )}
    </div>
  );
}

export default ProcessingResults;