'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {/* Logo */}
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-white font-bold text-3xl">N</span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">歡迎使用 Newledge</h2>
          <p className="text-gray-600 mb-8">
            您的智慧新聞聚合平台，使用 Google 帳號快速登入開始使用
          </p>
        </div>

        <div className="space-y-6">
          {/* Google Login Button */}
          <GoogleLoginButton 
            className="w-full"
            onError={(error) => {
              console.error('Login error:', error);
              // You can add toast notification here
            }}
          />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">或</span>
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              登入即表示您同意我們的{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                服務條款
              </a>{' '}
              和{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                隱私政策
              </a>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">個人化新聞追蹤</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">AI 智慧摘要</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6zM4 5h6V1H4v4zM14 5h6V1h-6v4z" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">多平台通知</span>
          </div>
        </div>
      </div>
    </div>
  );
}
