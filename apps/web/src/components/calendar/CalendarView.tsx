'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  isValid
} from 'date-fns';
import { ko } from 'date-fns/locale';
import type { VoiceMemo } from '@voice-organizer/shared';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time?: string;
  location?: string;
  originalText: string;
  calendarUrl: string | null;
  memoId: string;
  category: string;
}

interface CalendarViewProps {
  memos: VoiceMemo[];
}

// 단일 텍스트에서 이벤트 파싱
function parseSingleEvent(text: string, memoId: string, category: string, now: Date): CalendarEvent | null {
  if (!text || text.trim().length === 0) return null;

  // 요일 계산 헬퍼 함수
  const getNextDayOfWeek = (dayIndex: number, isNextWeek: boolean = false): Date => {
    const result = new Date(now);
    const currentDay = now.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0 || isNextWeek) {
      daysToAdd += 7;
    }
    if (isNextWeek && daysToAdd < 7) {
      daysToAdd += 7;
    }
    result.setDate(result.getDate() + daysToAdd);
    return result;
  };

  // 요일 인덱스 맵
  const dayMap: Record<string, number> = {
    '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6
  };

  // 날짜 패턴 매칭 (우선순위 순)
  const datePatterns = [
    // "2025년 12월 7일" 형식
    { regex: /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/, parse: (m: RegExpMatchArray) => new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) },
    // "12월 7일" 형식
    { regex: /(\d{1,2})월\s*(\d{1,2})일/, parse: (m: RegExpMatchArray) => {
      const date = new Date(now.getFullYear(), parseInt(m[1]) - 1, parseInt(m[2]));
      if (date < now) date.setFullYear(date.getFullYear() + 1);
      return date;
    }},
    // "다음 주 월요일" 형식
    { regex: /다음\s*주?\s*(월|화|수|목|금|토|일)요일/, parse: (m: RegExpMatchArray) => getNextDayOfWeek(dayMap[m[1]], true) },
    // "이번 주 월요일" 형식
    { regex: /이번\s*주?\s*(월|화|수|목|금|토|일)요일/, parse: (m: RegExpMatchArray) => getNextDayOfWeek(dayMap[m[1]], false) },
    // "월요일", "화요일" 등 (이번 주 또는 다음 주)
    { regex: /(월|화|수|목|금|토|일)요일/, parse: (m: RegExpMatchArray) => getNextDayOfWeek(dayMap[m[1]], false) },
    // "내일"
    { regex: /내일/, parse: () => { const d = new Date(now); d.setDate(d.getDate() + 1); return d; }},
    // "모레"
    { regex: /모레/, parse: () => { const d = new Date(now); d.setDate(d.getDate() + 2); return d; }},
    // "오늘"
    { regex: /오늘/, parse: () => new Date(now) },
    // "주말" (가장 가까운 토요일)
    { regex: /주말/, parse: () => getNextDayOfWeek(6, false) }
  ];

  // 시간 패턴 (더 다양한 표현 지원)
  const timePatterns = [
    // "오후 9시 전에", "오전 10시까지"
    { regex: /(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분)?(?:\s*전에|\s*까지)?/, parse: (m: RegExpMatchArray) => {
      let hours = parseInt(m[2]);
      const minutes = m[3] ? parseInt(m[3]) : 0;
      if (m[1] === '오후' && hours !== 12) hours += 12;
      if (m[1] === '오전' && hours === 12) hours = 0;
      return { hours, minutes };
    }},
    // "9시 전에", "3시까지"
    { regex: /(\d{1,2})시(?:\s*(\d{1,2})분)?(?:\s*전에|\s*까지)?/, parse: (m: RegExpMatchArray) => {
      let hours = parseInt(m[1]);
      const minutes = m[2] ? parseInt(m[2]) : 0;
      // 9시 이하는 오전/오후 구분이 애매하지만, 문맥상 추정
      // 일반적으로 1-6시는 오후로 추정 (학교/업무 시간)
      if (hours >= 1 && hours <= 6) {
        hours += 12; // 오후로 간주
      }
      return { hours, minutes };
    }},
    { regex: /(\d{1,2}):(\d{2})/, parse: (m: RegExpMatchArray) => ({ hours: parseInt(m[1]), minutes: parseInt(m[2]) }) }
  ];

  // 장소 패턴
  const locationPatterns = [
    /에서\s+(.+?)(?:에서|와|과|랑|$)/,
    /(\S+(?:역|카페|식당|공원|센터|빌딩|병원|학교|회사|출구))\s*(?:에서|에)/,
    /장소[:\s]*(.+?)(?:에서|$)/,
    /(\S+역\s*\d+번\s*출구)/
  ];

  let eventDate: Date | null = null;
  let timeStr = '';

  // 날짜 추출
  for (const { regex, parse } of datePatterns) {
    const match = text.match(regex);
    if (match) {
      eventDate = parse(match);
      break;
    }
  }

  if (!eventDate || !isValid(eventDate)) return null;

  // 시간 추출
  for (const { regex, parse } of timePatterns) {
    const match = text.match(regex);
    if (match) {
      const { hours, minutes } = parse(match);
      eventDate.setHours(hours, minutes, 0, 0);
      timeStr = format(eventDate, 'HH:mm');
      break;
    }
  }

  // 장소 추출
  let location = '';
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      location = match[1].trim();
      break;
    }
  }

  // Google Calendar URL 생성
  let calendarUrl: string | null = null;
  if (eventDate && isValid(eventDate)) {
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 1);
    
    const formatGoogleDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: text.slice(0, 50),
      dates: `${formatGoogleDate(eventDate)}/${formatGoogleDate(endDate)}`,
      details: `음성 메모: ${text}`,
      ...(location && { location })
    });
    
    calendarUrl = `https://www.google.com/calendar/render?${params.toString()}`;
  }

  return {
    id: `${memoId}-${eventDate.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
    title: text.slice(0, 30) + (text.length > 30 ? '...' : ''),
    date: eventDate,
    time: timeStr,
    location,
    originalText: text,
    calendarUrl,
    memoId,
    category
  };
}

// 메모에서 모든 이벤트 파싱 (여러 항목 지원)
function parseEventsFromMemos(memos: VoiceMemo[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const now = new Date();

  // 일정 관련 카테고리
  const scheduleCategories = ['약속 일정', '학교 수업 과제 일정'];

  memos.forEach((memo) => {
    // 📅 allCategories가 있으면 개별 일정 항목 사용
    const allCategories = (memo as any).allCategories as Array<{category: string, summary_list: string[]}> | undefined;
    
    if (allCategories && Array.isArray(allCategories)) {
      // allCategories에서 일정 관련 카테고리의 항목들만 추출
      allCategories.forEach((cat) => {
        if (scheduleCategories.includes(cat.category) && cat.summary_list) {
          cat.summary_list.forEach((item: string) => {
            const trimmedItem = item.trim();
            if (!trimmedItem) return;
            
            const event = parseSingleEvent(trimmedItem, memo.id, cat.category, now);
            if (event) {
              events.push(event);
            }
          });
        }
      });
    } else {
      // fallback: 기존 방식 (summary 또는 transcription에서 파싱)
      const text = memo.summary || memo.transcription || '';
      if (!text) return;

      // | 구분자로 여러 항목이 있는 경우 각각 파싱
      const items = text.includes('|') ? text.split('|') : [text];
      
      items.forEach((item) => {
        const trimmedItem = item.trim();
        if (!trimmedItem) return;
        
        // 날짜/시간 키워드가 있는 항목만 파싱
        const hasDateKeyword = /(내일|모레|오늘|월요일|화요일|수요일|목요일|금요일|토요일|일요일|다음\s*주|이번\s*주|\d{1,2}월\s*\d{1,2}일|\d{1,2}시)/.test(trimmedItem);
        
        if (hasDateKeyword) {
          const event = parseSingleEvent(trimmedItem, memo.id, memo.category || '기타', now);
          if (event) {
            events.push(event);
          }
        }
      });
    }
  });

  return events;
}

// 카테고리별 색상
const CATEGORY_COLORS: Record<string, string> = {
  '쇼핑리스트': 'bg-green-500',
  '투두리스트': 'bg-blue-500',
  '약속 일정': 'bg-purple-500',
  '학교 수업 과제 일정': 'bg-orange-500',
  '아이디어': 'bg-yellow-500',
  '기타': 'bg-gray-500'
};

export function CalendarView({ memos }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 메모에서 이벤트 추출
  const events = useMemo(() => parseEventsFromMemos(memos), [memos]);

  // 현재 월의 날짜들 계산
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // 특정 날짜의 이벤트 가져오기
  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  // 선택된 날짜의 이벤트
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  // 이전/다음 월로 이동
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-4">
      {/* 캘린더 헤더 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-purple-600" />
              <span>일정 캘린더</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                오늘
              </Button>
              <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold min-w-[120px] text-center">
                {format(currentDate, 'yyyy년 M월', { locale: ko })}
              </span>
              <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day, index) => (
              <div 
                key={day} 
                className={`text-center text-sm font-medium py-2 ${
                  index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const dayOfWeek = day.getDay();

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    min-h-[80px] p-1 border rounded-lg cursor-pointer transition-all
                    ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${isSelected ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200 hover:border-purple-300'}
                    ${isToday(day) ? 'bg-purple-50' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${!isCurrentMonth ? 'text-gray-400' : ''}
                    ${isToday(day) ? 'text-purple-600 font-bold' : ''}
                    ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  
                  {/* 이벤트 표시 */}
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs truncate px-1 py-0.5 rounded text-white ${CATEGORY_COLORS[event.category] || 'bg-gray-500'}`}
                        title={event.originalText}
                      >
                        {event.time && <span className="mr-1">{event.time}</span>}
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 2}개 더
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 날짜의 이벤트 상세 */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {format(selectedDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>이 날짜에 등록된 일정이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event) => (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-lg border-l-4 bg-gray-50 ${
                      CATEGORY_COLORS[event.category]?.replace('bg-', 'border-') || 'border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.originalText}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          {event.time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {event.time}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full text-white ${CATEGORY_COLORS[event.category] || 'bg-gray-500'}`}>
                          {event.category}
                        </span>
                      </div>
                      {event.calendarUrl && (
                        <Button
                          onClick={() => window.open(event.calendarUrl!, '_blank')}
                          variant="outline"
                          size="sm"
                          className="ml-2 bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                        >
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          Google
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 이벤트 요약 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">이번 달 일정 요약</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(CATEGORY_COLORS).map(([category, color]) => {
              const count = events.filter(e => 
                e.category === category && 
                isSameMonth(e.date, currentDate)
              ).length;
              
              return (
                <div key={category} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-sm text-gray-600 truncate">{category}</span>
                  <span className="ml-auto font-semibold text-gray-900">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <span className="font-medium text-gray-700">이번 달 전체</span>
            <span className="text-lg font-bold text-purple-600">
              {events.filter(e => isSameMonth(e.date, currentDate)).length}개
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CalendarView;
