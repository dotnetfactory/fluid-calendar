/**
 * Minimal in-memory fixed-window rate limiter for the /api/v1 surface.
 *
 * Scoped to a single app instance (sufficient for the current single-container
 * deploy). A distributed limiter (Redis) is a Phase-2 concern; the call sites
 * and headers are designed so that swap is transparent.
 */

type Window = { count: number; resetAt: number };

const buckets = new Map<string, Window>();

// Opportunistic eviction so the map can't grow unbounded with one entry per
// (user, bucket). Swept every N calls rather than on a timer (serverless-safe).
let opsSinceSweep = 0;
function maybeSweep(now: number): void {
  if (++opsSinceSweep < 500) return;
  opsSinceSweep = 0;
  for (const [key, win] of buckets) {
    if (win.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitState = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // unix seconds
  retryAfter?: number; // seconds, only when blocked
};

/**
 * Consume one token from `bucketKey`. Default: 120 requests / 60s.
 * Use a tighter limit on the expensive scheduler path.
 */
export function rateLimit(
  bucketKey: string,
  opts?: { limit?: number; windowMs?: number }
): RateLimitState {
  const limit = opts?.limit ?? 120;
  const windowMs = opts?.windowMs ?? 60_000;
  const now = Date.now();
  maybeSweep(now);

  let win = buckets.get(bucketKey);
  if (!win || win.resetAt <= now) {
    win = { count: 0, resetAt: now + windowMs };
    buckets.set(bucketKey, win);
  }

  win.count += 1;
  const reset = Math.ceil(win.resetAt / 1000);

  if (win.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
      retryAfter: Math.max(1, Math.ceil((win.resetAt - now) / 1000)),
    };
  }

  return { allowed: true, limit, remaining: limit - win.count, reset };
}

/** Test/maintenance helper. */
export function _resetRateLimitBuckets(): void {
  buckets.clear();
}
