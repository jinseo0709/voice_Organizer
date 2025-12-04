const CACHE_NAME = 'voice-organizer-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/auth',
  '/manifest.json',
  // 기본적인 정적 파일들은 Next.js가 자동으로 처리
];

// 동적으로 캐시할 리소스 패턴
const DYNAMIC_CACHE_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\/screenshots\//,
];

// 캐시하지 않을 URL 패턴
const EXCLUDE_CACHE_PATTERNS = [
  /\/api\//,
  /\/_next\/webpack-hmr/,
  /chrome-extension:/,
];

// Install 이벤트 - 기본 리소스 캐시
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate 이벤트 - 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch 이벤트 - 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // GET 요청만 처리
  if (method !== 'GET') {
    return;
  }

  // 캐시하지 않을 URL 패턴 확인
  if (EXCLUDE_CACHE_PATTERNS.some(pattern => pattern.test(url))) {
    return;
  }

  // API 요청은 네트워크 우선
  if (url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // 오프라인에서 API 요청 실패 시 적절한 응답 반환
          return new Response(
            JSON.stringify({ error: 'Offline', message: '오프라인 상태입니다' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'application/json',
              }),
            }
          );
        })
    );
    return;
  }

  // 정적 리소스는 캐시 우선 (Cache First)
  if (DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(url))) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          
          return fetch(request)
            .then((response) => {
              // 유효한 응답인지 확인
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // 응답을 복사해서 캐시에 저장
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });

              return response;
            });
        })
    );
    return;
  }

  // HTML 페이지는 네트워크 우선, 캐시 백업 (Network First)
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 유효한 응답이면 캐시에 저장
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 응답
          return caches.match(request)
            .then((response) => {
              if (response) {
                return response;
              }
              
              // 캐시에도 없으면 오프라인 페이지 반환
              return caches.match('/')
                .then((response) => {
                  return response || new Response(
                    '<h1>오프라인</h1><p>인터넷 연결을 확인해주세요.</p>',
                    {
                      headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    }
                  );
                });
            });
        })
    );
    return;
  }
});

// Push 알림 처리 (향후 확장용)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || '새로운 알림이 있습니다',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'voice-organizer-notification',
      renotify: true,
      requireInteraction: false,
      actions: [
        {
          action: 'view',
          title: '보기',
          icon: '/icons/view-action.png'
        },
        {
          action: 'dismiss',
          title: '닫기',
          icon: '/icons/dismiss-action.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Voice Organizer', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// 백그라운드 동기화 (향후 확장용)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'voice-memo-sync') {
    event.waitUntil(
      // 여기에 오프라인에서 저장된 음성 메모를 서버와 동기화하는 로직 추가
      console.log('Voice memo sync completed')
    );
  }
});

// 에러 핸들링
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker registered');