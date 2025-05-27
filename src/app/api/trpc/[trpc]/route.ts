import { type NextRequest } from "next/server";

import { appRouter } from "@/server/trpc/root";
import { createTRPCContext } from "@/server/trpc/trpc";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "tRPC-Handler";

const handler = (req: NextRequest) => {
  logger.info(
    "tRPC request received",
    {
      method: req.method,
      url: req.url,
      pathname: new URL(req.url).pathname,
    },
    LOG_SOURCE
  );

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            logger.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}`,
              {
                path: path || "<no-path>",
                error: error.message,
                stack: error.stack || "No stack trace",
              },
              LOG_SOURCE
            );
          }
        : ({ error }) => {
            logger.error(
              "tRPC error in production",
              { error: error.message },
              LOG_SOURCE
            );
          },
  });
};

export { handler as GET, handler as POST };
