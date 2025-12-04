'use client';

import { useEffect, useState } from 'react';

interface PWAInstallProps {
  children?: React.ReactNode;
}

export function PWAInstall({ children }: PWAInstallProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Service Worker 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // 업데이트 확인
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 새 버전이 설치됨 - 사용자에게 알림
                  console.log('새 버전이 사용 가능합니다. 페이지를 새로고침해주세요.');
                }
              });
            }
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    }

    // PWA 설치 가능 여부 감지
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('PWA 설치 가능');
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // PWA 설치 완료 감지
    const handleAppInstalled = () => {
      console.log('PWA가 설치되었습니다');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // 이미 PWA로 실행 중인지 확인
    const checkIfPWA = () => {
      const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      if (isPWA) {
        setIsInstalled(true);
        console.log('PWA 모드로 실행 중');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    checkIfPWA();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // PWA 설치 실행
  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA 설치 수락됨');
    } else {
      console.log('PWA 설치 거부됨');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <>
      {children}
      
      {/* PWA 설치 프롬프트 */}
      {isInstallable && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                📱
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">
                앱 설치
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                홈 화면에 Voice Organizer를 추가하여 더 빠르게 접근하세요
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstallPWA}
                  className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-600 transition-colors"
                >
                  설치
                </button>
                <button
                  onClick={() => setIsInstallable(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors"
                >
                  나중에
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA 설치 완료 알림 */}
      {isInstalled && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 text-green-800 px-4 py-2 rounded-lg text-sm z-50 animate-fade-in">
          ✅ 앱이 설치되었습니다!
        </div>
      )}
    </>
  );
}

// 추가 PWA 유틸리티 함수들
export const PWAUtils = {
  // 온라인/오프라인 상태 확인
  isOnline: () => navigator.onLine,
  
  // 알림 권한 요청
  requestNotificationPermission: async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  },
  
  // 로컬 알림 표시
  showNotification: (title: string, options?: NotificationOptions) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options,
      });
    }
  },
  
  // 화면 깨어있게 하기 (Wake Lock API)
  requestWakeLock: async () => {
    if ('wakeLock' in navigator) {
      try {
        const wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Wake lock activated');
        return wakeLock;
      } catch (err) {
        console.error('Wake lock failed:', err);
      }
    }
    return null;
  },
  
  // 진동 패턴
  vibrate: (pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  },
  
  // 배터리 정보 (실험적 API)
  getBatteryInfo: async () => {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        };
      } catch (err) {
        console.error('Battery API not available:', err);
      }
    }
    return null;
  },
};