'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  User,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';

// Google 아이콘 컴포넌트
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

type AuthMode = 'signin' | 'signup';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  general?: string;
}

export default function AuthPage() {
  const router = useRouter();
  const { user, signInDemo, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAnonymously } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [anonymousLoading, setAnonymousLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // 이미 로그인된 사용자 체크
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다.';
    }
    
    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다.';
    }
    
    // 회원가입시 비밀번호 확인 검증
    if (mode === 'signup') {
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // 실시간 오류 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  // Firebase 에러 메시지를 사용자 친화적으로 변환
  const getFirebaseErrorMessage = (error: any): string => {
    const errorCode = error?.code || '';
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return '이미 사용 중인 이메일입니다.';
      case 'auth/invalid-email':
        return '올바른 이메일 형식이 아닙니다.';
      case 'auth/operation-not-allowed':
        return '이 로그인 방식은 현재 비활성화되어 있습니다.';
      case 'auth/weak-password':
        return '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
      case 'auth/user-disabled':
        return '이 계정은 비활성화되었습니다.';
      case 'auth/user-not-found':
        return '등록되지 않은 이메일입니다.';
      case 'auth/wrong-password':
        return '비밀번호가 올바르지 않습니다.';
      case 'auth/invalid-credential':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'auth/too-many-requests':
        return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
      case 'auth/popup-closed-by-user':
        return '로그인 팝업이 닫혔습니다. 다시 시도해주세요.';
      case 'auth/popup-blocked':
        return '팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.';
      case 'auth/cancelled-popup-request':
        return '로그인이 취소되었습니다.';
      default:
        return error?.message || '로그인 중 오류가 발생했습니다.';
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      if (mode === 'signin') {
        // Firebase 이메일 로그인
        await signInWithEmail(formData.email, formData.password);
      } else {
        // Firebase 회원가입
        await signUpWithEmail(formData.email, formData.password, formData.displayName || undefined);
      }
      router.push('/');
    } catch (error: any) {
      console.error('Firebase auth failed:', error);
      setErrors({
        general: getFirebaseErrorMessage(error)
      });
    } finally {
      setLoading(false);
    }
  };

  // Google 로그인
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setErrors({});
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (error: any) {
      console.error('Google login failed:', error);
      setErrors({
        general: getFirebaseErrorMessage(error)
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  // 익명 로그인
  const handleAnonymousLogin = async () => {
    setAnonymousLoading(true);
    setErrors({});
    try {
      await signInAnonymously();
      router.push('/');
    } catch (error: any) {
      console.error('Anonymous login failed:', error);
      setErrors({
        general: getFirebaseErrorMessage(error)
      });
    } finally {
      setAnonymousLoading(false);
    }
  };

  // 데모 로그인
  const handleDemoLogin = async () => {
    setLoading(true);
    setErrors({});
    try {
      await signInDemo('demo@voice-organizer.com');
      router.push('/');
    } catch (error: any) {
      console.error('Demo login failed:', error);
      setErrors({
        general: '데모 로그인 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'signin' ? 'signup' : 'signin');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    });
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Voice Organizer
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {mode === 'signin'
              ? 'Voice Organizer에 오신 것을 환영합니다'
              : '새 계정을 만들어 시작하세요'
            }
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 일반 오류 메시지 */}
          {errors.general && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              {errors.general}
            </div>
          )}
          
          {/* 이메일/비밀번호 폼 */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* 회원가입시 이름 입력 */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">이름 (선택)</Label>
                <div className="relative">
                  <UserCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="홍길동"
                    value={formData.displayName}
                    onChange={handleInputChange('displayName')}
                    className="pl-10"
                    disabled={loading || googleLoading || anonymousLoading}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                  disabled={loading || googleLoading || anonymousLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  disabled={loading || googleLoading || anonymousLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={loading || googleLoading || anonymousLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password}</p>
              )}
            </div>
            
            {/* 회원가입시 비밀번호 확인 */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={formData.confirmPassword}
                    onChange={handleInputChange('confirmPassword')}
                    className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    disabled={loading || googleLoading || anonymousLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading || googleLoading || anonymousLoading}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={loading || googleLoading || anonymousLoading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  처리 중...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  {mode === 'signin' ? <LogIn className="mr-2" size={20} /> : <UserPlus className="mr-2" size={20} />}
                  {mode === 'signin' ? '로그인' : '회원가입'}
                </div>
              )}
            </Button>
          </form>

          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="px-2 bg-white text-sm text-gray-500">또는</span>
            </div>
          </div>

          {/* 소셜 로그인 버튼들 */}
          <div className="space-y-3">
            {/* Google 로그인 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading || anonymousLoading}
            >
              {googleLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Google 로그인 중...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <GoogleIcon />
                  <span className="ml-2">Google로 계속하기</span>
                </div>
              )}
            </Button>

            {/* 익명 로그인 */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAnonymousLogin}
              disabled={loading || googleLoading || anonymousLoading}
            >
              {anonymousLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  처리 중...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <User className="mr-2" size={20} />
                  게스트로 시작하기
                </div>
              )}
            </Button>

            {/* 데모 로그인 (로컬) */}
            <Button
              variant="ghost"
              className="w-full text-gray-500 hover:text-gray-700"
              onClick={handleDemoLogin}
              disabled={loading || googleLoading || anonymousLoading}
            >
              <div className="flex items-center justify-center text-sm">
                데모 모드 (Firebase 미연결)
              </div>
            </Button>
          </div>
          
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
              disabled={loading || googleLoading || anonymousLoading}
            >
              {mode === 'signin' 
                ? '계정이 없으신가요? 회원가입' 
                : '이미 계정이 있으신가요? 로그인'
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}