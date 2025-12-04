'use client';

import { useState, useEffect } from 'react';
import { SafeAuthService } from '../lib/safeAuth';

export default function AuthComponent() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

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

  const handleEmailAuth = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 모두 입력하세요');
      return;
    }

    if (isSignUp) {
      const result = await SafeAuthService.signUpWithEmail(email, password);
      if (result.success) {
        console.log('회원가입 성공:', result.user);
        setEmail('');
        setPassword('');
      } else {
        setError(result.error || '회원가입 실패');
      }
    } else {
      const result = await SafeAuthService.signInWithEmail(email, password);
      if (result.success) {
        console.log('로그인 성공:', result.user);
        setEmail('');
        setPassword('');
      } else {
        setError(result.error || '로그인 실패');
      }
    }
  };

  const handleSignOut = async () => {
    const result = await SafeAuthService.signOut();
    if (!result.success) {
      setError(result.error || '로그아웃 실패');
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
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-16 h-16 rounded-full mx-auto mb-2"
              />
            ) : (
              <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
              </div>
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
        Voice Organizer
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

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
            onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="비밀번호를 입력하세요"
          />
        </div>

        <button
          onClick={handleEmailAuth}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          {isSignUp ? '회원가입' : '로그인'}
        </button>

        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          className="w-full text-blue-600 hover:text-blue-700 text-sm"
        >
          {isSignUp ? '이미 계정이 있나요? 로그인' : '계정이 없나요? 회원가입'}
        </button>
      </div>
    </div>
  );
}
