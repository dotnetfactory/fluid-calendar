import { NextRequest, NextResponse } from "next/server";

import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { repushDirtyBlocks } from "@/lib/task-block-push";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

const LOG_SOURCE = "api-internal-cron-replan";

/**
 * POST /api/internal/cron/replan — server-side periodic re-plan.
 *
 * The self-hosted (OSS) build ships no background worker, so auto-scheduled
 * tasks only move when a request triggers scheduleAllTasksForUser. Without a
 * periodic nudge, an unfinished task whose slot has already passed just sits in
 * the past until the user next touches something. Hosted schedulers (Motion,
 * the SaaS edition) get this for free from a cloud worker; self-hosters don't.
 *
 * This endpoint is meant to be driven by a cron on the host (e.g. every 15 min
 * during work hours): it re-plans every auto-scheduling user and re-syncs the
 * pushed calendar blocks that moved, so past-due tasks roll forward on their own
 * and the user's calendar follows — even with no browser open.
 *
 * Auth is a shared secret (CRON_SECRET via Bearer), not a user API key. When
 * CRON_SECRET is unset the endpoint is disabled (404), so a default install
 * never exposes an unauthenticated re-plan trigger.
 */
export async function POST(request: NextRequest) {
  const auth = verifyCronSecret(request);
  if (auth === "disabled") {
    // Indistinguishable from a non-existent route: don't advertise the feature
    // on installs that haven't opted in by setting CRON_SECRET.
    return new NextResponse("Not Found", { status: 404 });
  }
  if (auth === "unauthorized") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Every user who has configured auto-scheduling. Single-tenant installs have
  // exactly one; iterating keeps this correct for multi-user self-hosting too.
  const users = await prisma.autoScheduleSettings.findMany({
    select: { userId: true },
  });

  let replanned = 0;
  const skipped: { userId: string; reason: string }[] = [];

  for (const { userId } of users) {
    try {
      // The scheduler resolves the user's timezone from UserSettings.timeZone;
      // if it was never set, it would silently fall back and place tasks in the
      // wrong zone. Skip rather than mis-schedule on an unattended cron run.
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { timeZone: true },
      });
      if (!userSettings?.timeZone) {
        skipped.push({ userId, reason: "no_timezone" });
        continue;
      }

      await scheduleAllTasksForUser(userId);
      // Re-sync the blocks the re-plan moved (scheduleAllTasksForUser flags them
      // dirty); without this the calendar would keep showing the old times.
      await repushDirtyBlocks(userId);
      replanned += 1;
    } catch (error) {
      // One user's failure must not abort the batch.
      logger.error(
        "Cron re-plan failed for user",
        { userId, error: error instanceof Error ? error.message : "unknown" },
        LOG_SOURCE
      );
      skipped.push({ userId, reason: "replan_failed" });
    }
  }

  logger.info(
    "Cron re-plan complete",
    { replanned, skipped: skipped.length },
    LOG_SOURCE
  );

  return NextResponse.json({ replanned, skipped });
}
