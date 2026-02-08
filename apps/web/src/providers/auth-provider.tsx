'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/lib/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const publicPaths = ['/login', '/register', '/forgot-password'];

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, setUser } = useAuthStore();

  // Portal routes manage their own auth - skip main auth provider logic
  const isPortalPath = pathname.startsWith('/portal');

  useEffect(() => {
    if (isPortalPath) {
      // Don't check main auth for portal routes
      if (isLoading) setUser(null);
      return;
    }

    const checkAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    checkAuth();
  }, [setUser, isPortalPath, isLoading]);

  useEffect(() => {
    if (isPortalPath) return;

    if (!isLoading) {
      const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

      if (!user && !isPublicPath) {
        router.push('/login');
      } else if (user && isPublicPath) {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router, isPortalPath]);

  // Portal routes are always rendered (they manage their own auth)
  if (isPortalPath) {
    return <>{children}</>;
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  // Show content for public paths or authenticated users
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  if (isPublicPath || user) {
    return <>{children}</>;
  }

  // Redirect to login is handled by useEffect
  return null;
}
