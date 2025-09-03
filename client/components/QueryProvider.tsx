'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // These are conservative defaults for a CRM app
            staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
            gcTime: 15 * 60 * 1000, // 15 minutes - cache garbage collection time (was cacheTime)
            retry: 2, // Retry failed requests 2 times
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false, // Don't refetch on window focus for CRM data
            refetchOnMount: false, // Don't refetch on component mount if data is fresh
            refetchOnReconnect: true, // Refetch when network reconnects
          },
          mutations: {
            retry: 1, // Retry failed mutations 1 time
            onError: (error) => {
              console.error('Mutation error:', error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
