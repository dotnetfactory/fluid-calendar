"use client";

import { type AppRouter } from "@/server/trpc/root";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import { getBaseUrl } from "@/lib/utils";

/**
 * Create tRPC React hooks
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Create tRPC client with configuration
 */
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      // You can pass any HTTP headers you want here
      async headers() {
        return {
          // Add authorization headers here if needed
          // Authorization: `Bearer ${token}`,
        };
      },
    }),
  ],
});

/**
 * Utility type for tRPC procedures
 */
export type TRPCUtils = ReturnType<typeof trpc.useContext>;
