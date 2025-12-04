'use client';

import { useState, useEffect } from 'react';
import { SafeAuthService } from '../lib/safeAuth';

export default function AuthComponent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const setupAuth = async () => {
      try {
        unsubscribe = await SafeAuthService.onAuthStateChanged((user) => {
          setUser(user);
          setLoading(false);
        });
      } catch (error) {
        console.error('SafeAuthService 초기화 오류:', error);
        setLoading(false);
      }
    };

    setupAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    const result = await SafeAuthService.signInWithGoogle();
    if (result.success) {
      console.log('Google 로그인 성공:', result.user);
    } else {
      alert(`Google 로그인 실패: ${result.error}`);
    }
  };

  const handleEmailAuth = async () => {
    if (isSignUp) {
      const result = await SafeAuthService.signUpWithEmail(email, password);
      if (result.success) {
        console.log('회원가입 성공:', result.user);
        setEmail('');
        setPassword('');
      } else {
        alert(`회원가입 실패: ${result.error}`);
      }
    } else {
      const result = await SafeAuthService.signInWithEmail(email, password);
      if (result.success) {
        console.log('로그인 성공:', result.user);
        setEmail('');
        setPassword('');
      } else {
        alert(`로그인 실패: ${result.error}`);
      }
    }
  };

  const handleSignOut = async () => {
    const result = await SafeAuthService.signOut();
    if (result.success) {
      console.log('로그아웃 성공');
    } else {
      alert(`로그아웃 실패: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">인증 상태 확인 중...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <div className="text-center">
          <div className="mb-4">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-16 h-16 rounded-full mx-auto mb-2"
              />
            )}
            <h3 className="text-lg font-semibold text-gray-900">
              환영합니다!
            </h3>
            <p className="text-sm text-gray-600">
              {user.displayName || user.email}
            </p>
          </div>
          
          <div className="space-y-2 text-sm text-gray-500">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>UID:</strong> {user.uid}</p>
            <p><strong>Provider:</strong> {user.providerData[0]?.providerId || 'email'}</p>
            <p><strong>Verified:</strong> {user.emailVerified ? '✅' : '❌'}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="mt-6 w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center mb-6">
        Firebase Authentication
      </h2>

      {/* Google 로그인 */}
      <button
        onClick={handleGoogleSignIn}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors mb-4 flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google로 로그인
      </button>

      {/* 이메일/비밀번호 로그인 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이메일을 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="비밀번호를 입력하세요"
          />
        </div>

        <button
          onClick={handleEmailAuth}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
        >
          {isSignUp ? '회원가입' : '로그인'}
        </button>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-blue-600 hover:text-blue-700 text-sm"
        >
          {isSignUp ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
        </button>
      </div>
    </div>
  );
}