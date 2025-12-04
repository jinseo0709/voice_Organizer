'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void;
  maxDuration?: number; // 최대 녹음 시간 (초)
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'completed';

export function VoiceRecorder({ 
  onRecordingComplete, 
  maxDuration = 300 // 5분 기본값
}: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000, // GCP Speech-to-Text 최적화
          channelCount: 1, // 모노 오디오
          autoGainControl: true,
        } 
      });

      // GCP Speech-to-Text 호환성을 위한 오디오 형식
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000, // 고품질 오디오
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setRecordingState('completed');
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
        
        // 콜백 호출
        if (onRecordingComplete) {
          onRecordingComplete(audioBlob, duration);
        }
      };

      mediaRecorder.start(100); // 100ms마다 데이터 수집
      setRecordingState('recording');
      setDuration(0);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          // 최대 시간에 도달하면 자동 정지
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  }, [maxDuration, onRecordingComplete, duration]);

  // 녹음 일시정지/재개
  const togglePauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      // 타이머 재시작
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
            return newDuration;
          }
          return newDuration;
        });
      }, 1000);
    }
  }, [recordingState, maxDuration]);

  // 녹음 정지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState !== 'idle') {
      mediaRecorderRef.current.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState]);

  // 재생/정지
  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying]);

  // 새 녹음 시작
  const resetRecording = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setRecordingState('idle');
    setDuration(0);
    setIsPlaying(false);
  }, [audioUrl]);

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 컴포넌트 언마운트 시 정리
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
        {/* 녹음 상태 표시 */}
        <div className="text-center mb-6">
          {/* 시각적 상태 표시 */}
          <div className="mb-4">
            {recordingState === 'recording' && (
              <div className="w-24 h-24 mx-auto bg-red-100 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <Mic className="text-white" size={20} />
                </div>
              </div>
            )}
            {recordingState === 'paused' && (
              <div className="w-24 h-24 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Pause className="text-white" size={20} />
                </div>
              </div>
            )}
            {recordingState === 'completed' && (
              <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  {isPlaying ? <Pause className="text-white" size={20} /> : <Play className="text-white" size={20} />}
                </div>
              </div>
            )}
            {recordingState === 'idle' && (
              <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Mic className="text-white" size={20} />
                </div>
              </div>
            )}
          </div>
          
          {/* 시간 표시 */}
          <div className="text-4xl sm:text-5xl font-mono font-bold text-gray-900 mb-2">
            {formatTime(duration)}
          </div>
          
          {/* 상태 텍스트 */}
          <div className="text-sm sm:text-base text-gray-600 font-medium">
            {recordingState === 'idle' && '녹음 준비 완료'}
            {recordingState === 'recording' && '🔴 녹음 중...'}
            {recordingState === 'paused' && '⏸️ 일시정지'}
            {recordingState === 'completed' && '✅ 녹음 완료'}
          </div>
          
          {/* 최대 시간 표시 */}
          <div className="text-xs text-gray-400 mt-1">
            최대 {formatTime(maxDuration)}
          </div>
        </div>

        {/* 진행 바 */}
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                recordingState === 'recording' ? 'bg-red-500' :
                recordingState === 'paused' ? 'bg-yellow-500' :
                recordingState === 'completed' ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((duration / maxDuration) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 컨트롤 버튼들 */}
        <div className="flex justify-center items-center gap-3 sm:gap-4">
          {recordingState === 'idle' && (
            <Button 
              onClick={startRecording} 
              size="lg" 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-transform touch-manipulation"
            >
              <Mic size={28} />
            </Button>
          )}

          {(recordingState === 'recording' || recordingState === 'paused') && (
            <>
              <Button
                onClick={togglePauseRecording}
                variant="outline"
                size="lg"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full active:scale-95 transition-transform touch-manipulation"
              >
                {recordingState === 'recording' ? <Pause size={20} /> : <Play size={20} />}
              </Button>
              <Button
                onClick={stopRecording}
                variant="destructive"
                size="lg"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full active:scale-95 transition-transform touch-manipulation"
              >
                <Square size={20} />
              </Button>
            </>
          )}

          {recordingState === 'completed' && (
            <>
              <Button
                onClick={togglePlayback}
                variant="outline"
                size="lg"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full active:scale-95 transition-transform touch-manipulation"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>
              <Button
                onClick={resetRecording}
                variant="outline"
                size="lg"
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full active:scale-95 transition-transform touch-manipulation"
              >
                <MicOff size={20} />
              </Button>
            </>
          )}
        </div>

        {/* 도움말 텍스트 */}
        <div className="text-center mt-6">
          <div className="text-xs sm:text-sm text-gray-500">
            {recordingState === 'idle' && '마이크 버튼을 터치해서 녹음 시작'}
            {recordingState === 'recording' && '일시정지 또는 정지 버튼 사용'}
            {recordingState === 'paused' && '재생 버튼으로 녹음 계속'}
            {recordingState === 'completed' && '재생하거나 새 녹음 시작'}
          </div>
        </div>
      </div>
    </div>
  );
}