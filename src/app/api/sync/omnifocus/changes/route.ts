import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "OmniFocusSyncChangesAPI";

/**
 * GET /api/sync/omnifocus/changes
 *
 * Returns unsynced TaskChange records for omnifocus-sourced tasks
 * where the change was NOT made by the sync script itself (changeSource != "omnifocus").
 * This prevents echo loops in bidirectional sync.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get unsynced changes for OF-sourced tasks made by the user (not by the sync script)
    const changes = await prisma.taskChange.findMany({
      where: {
        userId,
        synced: false,
        changeSource: { not: "omnifocus" }, // Exclude changes made by the sync script
        task: {
          source: "omnifocus",
          externalTaskId: { not: null },
        },
      },
      include: {
        task: {
          select: {
            id: true,
            externalTaskId: true,
            title: true,
            status: true,
            completedAt: true,
            scheduledStart: true,
            scheduledEnd: true,
          },
        },
      },
      orderBy: { timestamp: "asc" },
    });

    // Map to a clean response format
    const mapped = changes.map((c) => ({
      id: c.id,
      fcTaskId: c.taskId,
      externalTaskId: c.task?.externalTaskId,
      changeType: c.changeType,
      changeData: c.changeData,
      timestamp: c.timestamp,
      task: c.task
        ? {
            status: c.task.status,
            completedAt: c.task.completedAt,
            scheduledStart: c.task.scheduledStart,
            scheduledEnd: c.task.scheduledEnd,
            title: c.task.title,
          }
        : null,
    }));

    return NextResponse.json({
      changes: mapped,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Failed to fetch OF sync changes",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch changes" },
      { status: 500 }
    );
  }
}
