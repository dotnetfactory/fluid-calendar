import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ApiIdempotency";

export type IdempotentResult = { status: number; body: unknown };

/**
 * Replay-safe writes for /api/v1. When the caller sends an `Idempotency-Key`,
 * the first successful (2xx) response is stored per (userId, key) and returned
 * verbatim on any later replay — so AI/webhook retries can't double-create.
 *
 * Non-2xx results are NOT stored, so a transient failure stays retryable.
 */
export async function runIdempotent(params: {
  userId: string;
  key: string | null;
  route: string;
  produce: () => Promise<IdempotentResult>;
}): Promise<IdempotentResult> {
  const { userId, key, route, produce } = params;
  if (!key) return produce();

  const existing = await prisma.idempotencyKey.findUnique({
    where: { userId_key: { userId, key } },
    select: { statusCode: true, responseJson: true },
  });
  if (existing) {
    return { status: existing.statusCode, body: existing.responseJson };
  }

  const result = await produce();

  if (result.status >= 200 && result.status < 300) {
    try {
      await prisma.idempotencyKey.create({
        data: {
          userId,
          key,
          route,
          statusCode: result.status,
          responseJson: result.body as object,
        },
      });
    } catch (error) {
      // Concurrent first request won the unique race — return the stored copy.
      const raced = await prisma.idempotencyKey.findUnique({
        where: { userId_key: { userId, key } },
        select: { statusCode: true, responseJson: true },
      });
      if (raced) return { status: raced.statusCode, body: raced.responseJson };
      logger.error(
        "Failed to persist idempotency key",
        { error: error instanceof Error ? error.message : "unknown", route },
        LOG_SOURCE
      );
    }
  }

  return result;
}
