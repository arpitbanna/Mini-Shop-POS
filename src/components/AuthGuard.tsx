'use client';

import { useAuthStore } from '@/lib/store';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isGuest } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAdmin && !isGuest && pathname !== '/login') {
      router.push('/login');
    } else if ((isAdmin || isGuest) && pathname === '/login') {
      router.push('/');
    }
  }, [isAdmin, isGuest, router, pathname]);

  return <>{children}</>;
}
