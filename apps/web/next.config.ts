import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Firebase Hosting을 위한 정적 export
  output: 'export',

  // 정적 export에서는 이미지 최적화 비활성화
  images: {
    unoptimized: true,
  },

  // PWA 설정
  experimental: {
    // 필요한 실험적 기능들
  },
  
  // Turbopack 설정
  turbopack: {
    root: '../../'
  },
  
  // 정적 파일 헤더 설정
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  
  // 보안 헤더 설정
  async rewrites() {
    return [
      // Service Worker 경로 설정
      {
        source: '/service-worker.js',
        destination: '/sw.js',
      },
    ];
  },
  
  
  // 성능 최적화
  compress: true,
  poweredByHeader: false,
  
  // 환경별 설정
  env: {
    NEXT_PUBLIC_PWA_ENABLED: 'true',
  },
};

export default nextConfig;
