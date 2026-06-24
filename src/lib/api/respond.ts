import { NextResponse } from "next/server";

import type { ApiKeyError } from "@/lib/auth/api-key";

/**
 * Consistent response envelope for the /api/v1 public surface.
 * Errors follow `{ error: { code, message, field?, retry_after? } }`
 * (Todoist/Cal.com shape); success returns the resource/list body directly.
 */

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_ARGUMENT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_ARGUMENT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export function ok<T>(
  body: T,
  init?: { status?: number; headers?: Record<string, string> }
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: init?.headers,
  });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  opts?: {
    field?: string;
    retryAfter?: number;
    headers?: Record<string, string>;
  }
): NextResponse {
  const status = STATUS_BY_CODE[code];
  const headers: Record<string, string> = { ...(opts?.headers ?? {}) };
  if (opts?.retryAfter != null) headers["Retry-After"] = String(opts.retryAfter);
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(opts?.field ? { field: opts.field } : {}),
        ...(opts?.retryAfter != null ? { retry_after: opts.retryAfter } : {}),
      },
    },
    { status, headers }
  );
}

/** Map an auth failure code from requireV1Auth to the error envelope. */
export function authErrorResponse(error: ApiKeyError): NextResponse {
  return error === "forbidden"
    ? apiError("FORBIDDEN", "API access is not enabled for this account.")
    : apiError("UNAUTHORIZED", "Invalid or missing API credentials.");
}

/** Standard X-RateLimit-* headers for a bucket result. */
export function rateLimitHeaders(state: {
  limit: number;
  remaining: number;
  reset: number; // unix seconds
}): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(state.limit),
    "X-RateLimit-Remaining": String(state.remaining),
    "X-RateLimit-Reset": String(state.reset),
  };
}

/** Shape for paginated list responses: `{ data, next_cursor, has_more }`. */
export function paginated<T>(
  data: T[],
  nextCursor: string | null
): { data: T[]; next_cursor: string | null; has_more: boolean } {
  return { data, next_cursor: nextCursor, has_more: nextCursor !== null };
}
