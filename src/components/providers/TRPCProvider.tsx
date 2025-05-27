"use client";

import { useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { trpc, trpcClient } from "@/lib/trpc/client";

interface TRPCProviderProps {
  children: React.ReactNode;
}

/**
 * TRPCProvider component that sets up tRPC with React Query
 * This wraps the application with tRPC client and QueryClient
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error: unknown) => {
              // Don't retry on authentication or forbidden errors
              const errorData = error as { data?: { code?: string } } | null;
              if (errorData && "data" in errorData) {
                if (errorData.data?.code === "UNAUTHORIZED") return false;
                if (errorData.data?.code === "FORBIDDEN") return false;
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false, // Don't retry mutations by default
          },
        },
      })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Show React Query devtools in development */}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
