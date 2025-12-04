'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // 초기 상태 설정
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      
      // 3초 후 자동으로 숨김
      setTimeout(() => setShowIndicator(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showIndicator && isOnline) {
    return null;
  }

  return (
    <div
      className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        showIndicator ? 'translate-y-2 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div
        className={`px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium ${
          isOnline
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi size={16} />
            <span>온라인으로 전환됨</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>오프라인 모드</span>
          </>
        )}
      </div>
    </div>
  );
}

// 오프라인 저장소 관리 훅
export function useOfflineStorage() {
  const [offlineData, setOfflineData] = useState<any[]>([]);

  const saveOfflineData = (data: any) => {
    try {
      const stored = localStorage.getItem('voice-organizer-offline');
      const offlineItems = stored ? JSON.parse(stored) : [];
      
      const newItem = {
        ...data,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        synced: false,
      };
      
      const updated = [newItem, ...offlineItems];
      localStorage.setItem('voice-organizer-offline', JSON.stringify(updated));
      setOfflineData(updated);
      
      return newItem;
    } catch (error) {
      console.error('오프라인 데이터 저장 실패:', error);
      return null;
    }
  };

  const getOfflineData = () => {
    try {
      const stored = localStorage.getItem('voice-organizer-offline');
      const data = stored ? JSON.parse(stored) : [];
      setOfflineData(data);
      return data;
    } catch (error) {
      console.error('오프라인 데이터 로드 실패:', error);
      return [];
    }
  };

  const syncOfflineData = async () => {
    try {
      const unsynced = offlineData.filter(item => !item.synced);
      
      for (const item of unsynced) {
        // 실제 API 호출로 동기화
        // await syncToServer(item);
        
        // 동기화 완료 표시
        item.synced = true;
      }
      
      localStorage.setItem('voice-organizer-offline', JSON.stringify(offlineData));
      setOfflineData([...offlineData]);
      
      console.log(`${unsynced.length}개 항목 동기화 완료`);
    } catch (error) {
      console.error('동기화 실패:', error);
    }
  };

  const clearSyncedData = () => {
    const unsynced = offlineData.filter(item => !item.synced);
    localStorage.setItem('voice-organizer-offline', JSON.stringify(unsynced));
    setOfflineData(unsynced);
  };

  useEffect(() => {
    getOfflineData();
    
    // 온라인 상태가 되면 자동 동기화
    const handleOnline = () => {
      if (offlineData.length > 0) {
        syncOfflineData();
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineData.length]);

  return {
    offlineData,
    saveOfflineData,
    getOfflineData,
    syncOfflineData,
    clearSyncedData,
    hasUnsyncedData: offlineData.some(item => !item.synced),
  };
}

// 오프라인 알림 컴포넌트
export function OfflineNotification() {
  const { hasUnsyncedData, syncOfflineData } = useOfflineStorage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(hasUnsyncedData && navigator.onLine);
  }, [hasUnsyncedData]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-blue-50 border border-blue-200 rounded-lg p-4 z-40">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            🔄
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-blue-900">
            동기화 대기 중
          </h3>
          <p className="text-xs text-blue-700 mt-1">
            오프라인에서 저장된 데이터가 있습니다. 동기화하시겠습니까?
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                syncOfflineData();
                setIsVisible(false);
              }}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors"
            >
              동기화
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-200 transition-colors"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}