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
 * The host fires this on a frequent, fixed heartbeat (e.g. every minute); the
 * cadence is governed in-app by SystemSettings.autoReplanIntervalMinutes, so an
 * admin can dial the reflow from a conservative default (15 min) down to
 * near-continuous (1 min) without ever touching the host schedule. When due it
 * re-plans every auto-scheduling user and re-syncs the pushed calendar blocks
 * that moved, so past-due tasks roll forward on their own and the calendar
 * follows — even with no browser open.
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

  // Cadence is admin-controlled in SystemSettings; the host heartbeat may fire
  // far more often than we want to re-plan. Gate on enabled + elapsed interval,
  // and claim this run by stamping autoReplanLastRunAt BEFORE the work so two
  // overlapping heartbeats can't both re-plan.
  const settings = await prisma.systemSettings.findFirst({
    select: {
      id: true,
      autoReplanEnabled: true,
      autoReplanIntervalMinutes: true,
      autoReplanLastRunAt: true,
    },
  });

  if (!settings?.autoReplanEnabled) {
    return NextResponse.json({ skipped: "disabled" });
  }

  const now = Date.now();
  const intervalMs = Math.max(1, settings.autoReplanIntervalMinutes) * 60_000;
  const lastRun = settings.autoReplanLastRunAt?.getTime() ?? 0;
  if (now - lastRun < intervalMs) {
    const dueInSec = Math.ceil((intervalMs - (now - lastRun)) / 1000);
    return NextResponse.json({ skipped: "not_due", dueInSec });
  }

  await prisma.systemSettings.update({
    where: { id: settings.id },
    data: { autoReplanLastRunAt: new Date(now) },
  });

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
