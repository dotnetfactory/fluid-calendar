import { createHash, timingSafeEqual } from "crypto";

import { NextRequest } from "next/server";

/**
 * Shared-secret auth for internal cron endpoints (e.g. the periodic re-plan).
 *
 * This is deliberately NOT a user API key: a cron acts across every
 * auto-scheduling user and must never be exposed as a user-facing credential.
 * The secret lives in the app's own environment (CRON_SECRET), set by the
 * operator, and is presented as `Authorization: Bearer <CRON_SECRET>`.
 *
 *   - "disabled"     CRON_SECRET is unset → the endpoint is OFF (fail closed),
 *                    so it can never run unauthenticated on a default install.
 *   - "unauthorized" CRON_SECRET is set but the request didn't present it.
 *   - "ok"           the presented bearer matches.
 *
 * The compare is constant-time and the secret is never logged. We hash both
 * sides to a fixed-length digest first so the timing-safe compare always runs
 * on equal-length buffers and the request can't leak the secret's length.
 */
export type CronAuthResult = "ok" | "disabled" | "unauthorized";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export function verifyCronSecret(request: NextRequest): CronAuthResult {
  const expected = process.env.CRON_SECRET;
  if (!expected) return "disabled";

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return "unauthorized";
  const provided = header.slice(7).trim();
  if (!provided) return "unauthorized";

  return timingSafeEqual(digest(provided), digest(expected))
    ? "ok"
    : "unauthorized";
}
