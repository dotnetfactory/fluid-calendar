import { TRPCError, initTRPC } from "@trpc/server";
import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { ZodError } from "zod";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "tRPC";

/**
 * Creates context for tRPC procedures
 * This runs for every tRPC procedure call
 */
export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const { req } = opts;

  // For now, we'll implement session handling later
  // The fetch adapter doesn't directly support NextAuth session extraction
  // We'll need to extract session from cookies or headers
  const session = null;
  const userId: string | undefined = undefined;

  // TODO: Implement proper session extraction from request headers/cookies
  // This will be implemented when we integrate with NextAuth properly

  return {
    req,
    session,
    userId,
    prisma,
    logger,
  };
};

/**
 * Initialize tRPC with context and configuration
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create tRPC router
 */
export const createTRPCRouter = t.router;

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.userId) {
    logger.warn(
      "Unauthorized access attempt to protected procedure",
      { hasSession: !!ctx.session, hasUserId: !!ctx.userId },
      LOG_SOURCE
    );
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      // Ensure we have the session and user data
      session: ctx.session,
      userId: ctx.userId,
    },
  });
});

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // For now, we'll implement proper role checking later when session is working
  // TODO: Check if user has admin role once session extraction is implemented

  return next({ ctx });
});

/**
 * Middleware for input logging (useful for debugging)
 */
export const loggedProcedure = t.procedure.use(
  ({ path, type, next, input }) => {
    logger.info(
      `tRPC ${type} call`,
      { path, input: JSON.stringify(input) },
      LOG_SOURCE
    );

    return next();
  }
);
