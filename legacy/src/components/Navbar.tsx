'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleLoginButton } from './GoogleLoginButton';
import { UserAvatar } from './UserAvatar';

const navigation = [
  { name: '追蹤管理', href: '/tracks', icon: '📊' },
];

export function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Newledge</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {isAuthenticated && user && navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {!isLoading && (
              <>
                {isAuthenticated && user ? (
                  <UserAvatar user={user} />
                ) : (
                  <GoogleLoginButton />
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="開啟選單"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="space-y-1">
              {isAuthenticated && user && navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-3 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Auth Section */}
              <div className="pt-4 border-t border-gray-200">
                {!isLoading && (
                  <>
                    {isAuthenticated && user ? (
                      <div className="px-4 py-3">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                            {user.iconUrl ? (
                              <img
                                src={user.iconUrl}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-medium text-gray-600">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            await logout();
                            setIsMenuOpen(false);
                            router.replace('/');
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>登出</span>
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-3">
                        <GoogleLoginButton className="w-full" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 