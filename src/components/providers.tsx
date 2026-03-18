'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { queryConfig } from '@/config/queryKeys';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: queryConfig.staleTimeMs,
        refetchOnWindowFocus: queryConfig.refetchOnWindowFocus,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" richColors theme="dark" />
    </QueryClientProvider>
  );
}
