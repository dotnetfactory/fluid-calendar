import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

import { requireV1Auth } from "@/lib/auth/api-key";
import { runIdempotent } from "@/lib/api/idempotency";
import { rateLimit } from "@/lib/api/rate-limit";
import {
  ApiErrorCode,
  apiError,
  authErrorResponse,
  ok,
  rateLimitHeaders,
} from "@/lib/api/respond";

const LOG_SOURCE = "ApiV1";

/**
 * Throw from a handler body to return a specific error envelope.
 * e.g. `throw new ApiHttpError("INVALID_ARGUMENT", "title is required", { field: "title" })`
 */
export class ApiHttpError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public opts?: { field?: string; retryAfter?: number }
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

export type V1Context = { userId: string; request: NextRequest };
export type V1Result = { status: number; body: unknown };

type RlOpts = { bucket?: string; limit?: number; windowMs?: number };

function checkRateLimit(userId: string, opts?: RlOpts) {
  const key = `v1:${opts?.bucket ?? "default"}:${userId}`;
  return rateLimit(key, { limit: opts?.limit, windowMs: opts?.windowMs });
}

function handleThrown(error: unknown, headers: Record<string, string>) {
  if (error instanceof ApiHttpError) {
    return apiError(error.code, error.message, {
      field: error.opts?.field,
      retryAfter: error.opts?.retryAfter,
      headers,
    });
  }
  logger.error(
    "Unhandled error in /api/v1 handler",
    { error: error instanceof Error ? error.message : "unknown" },
    LOG_SOURCE
  );
  return apiError("INTERNAL", "An unexpected error occurred.", { headers });
}

/**
 * Wrap a v1 WRITE handler: auth → rate-limit → idempotency → envelope.
 * The body returns `{ status, body }`; throw `ApiHttpError` for error envelopes.
 * `Idempotency-Key` replays the first 2xx response.
 */
export async function v1Write(
  request: NextRequest,
  routeLabel: string,
  produce: (ctx: V1Context) => Promise<V1Result>,
  rlOpts?: RlOpts
): Promise<NextResponse> {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return authErrorResponse(auth.error);
  const { userId } = auth;

  const rl = checkRateLimit(userId, rlOpts);
  const headers = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return apiError("RATE_LIMITED", "Rate limit exceeded.", {
      retryAfter: rl.retryAfter,
      headers,
    });
  }

  try {
    const key = request.headers.get("idempotency-key");
    const { status, body } = await runIdempotent({
      userId,
      key,
      route: routeLabel,
      produce: () => produce({ userId, request }),
    });
    return ok(body, { status, headers });
  } catch (error) {
    return handleThrown(error, headers);
  }
}

/**
 * Wrap a v1 READ handler: auth → rate-limit → envelope (no idempotency).
 */
export async function v1Read(
  request: NextRequest,
  produce: (ctx: V1Context) => Promise<V1Result>,
  rlOpts?: RlOpts
): Promise<NextResponse> {
  const auth = await requireV1Auth(request);
  if ("error" in auth) return authErrorResponse(auth.error);
  const { userId } = auth;

  const rl = checkRateLimit(userId, rlOpts);
  const headers = rateLimitHeaders(rl);
  if (!rl.allowed) {
    return apiError("RATE_LIMITED", "Rate limit exceeded.", {
      retryAfter: rl.retryAfter,
      headers,
    });
  }

  try {
    const { status, body } = await produce({ userId, request });
    return ok(body, { status: status ?? 200, headers });
  } catch (error) {
    return handleThrown(error, headers);
  }
}
