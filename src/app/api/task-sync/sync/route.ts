import { NextRequest, NextResponse } from "next/server";

/**
 * Task sync route shell.
 * OS mode: synchronous sync via TaskSyncManager (from src/features/api/task-sync.ts)
 * SaaS mode: async BullMQ job queue (from saas/src/api/task-sync.ts)
 *
 * The @saas alias resolves to the correct implementation automatically.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const handler = await import("@saas/api/task-sync");
  return handler.POST(req);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const handler = await import("@saas/api/task-sync");
  return handler.GET(req);
}
