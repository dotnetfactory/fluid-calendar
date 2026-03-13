/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { TaskSyncManager } from "@/lib/task-sync/task-sync-manager";

const LOG_SOURCE = "TaskSyncAPI";

const syncRequestSchema = z.object({
  providerId: z.string().optional(),
  mappingId: z.string().optional(),
  direction: z
    .enum(["incoming", "outgoing", "bidirectional"])
    .optional()
    .default("bidirectional"),
});

function isValidDirection(
  direction: string
): direction is "incoming" | "outgoing" | "bidirectional" {
  return ["incoming", "outgoing", "bidirectional"].includes(direction);
}

/**
 * Synchronous task sync handler (open-source version).
 * SaaS version uses async BullMQ jobs instead.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response as NextResponse;
    }

    const userId = auth.userId;
    const body = await request.json();
    const parseResult = syncRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Please provide either providerId or mappingId",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { providerId, mappingId } = parseResult.data;
    let { direction } = parseResult.data;

    if (direction && !isValidDirection(direction)) {
      return NextResponse.json(
        {
          error: "Invalid direction",
          message:
            "Direction must be 'incoming', 'outgoing', or 'bidirectional'",
        },
        { status: 400 }
      );
    }

    if (!providerId && !mappingId) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Please provide either providerId or mappingId",
        },
        { status: 400 }
      );
    }

    const syncManager = new TaskSyncManager();

    try {
      let result;

      if (mappingId) {
        const mapping = await prisma.taskListMapping.findFirst({
          where: {
            id: mappingId,
            provider: { userId },
          },
          include: { provider: true },
        });

        if (!mapping) {
          return NextResponse.json(
            {
              error: "Not found",
              message: "Task list mapping not found or does not belong to you",
            },
            { status: 404 }
          );
        }

        if (!direction) {
          direction = mapping.direction as
            | "incoming"
            | "outgoing"
            | "bidirectional";
        }

        result = await syncManager.syncTaskList(mapping);
      } else if (providerId) {
        const provider = await prisma.taskProvider.findFirst({
          where: { id: providerId, userId },
        });

        if (!provider) {
          return NextResponse.json(
            {
              error: "Not found",
              message: "Provider not found or does not belong to you",
            },
            { status: 404 }
          );
        }

        const mappings = await prisma.taskListMapping.findMany({
          where: { providerId },
          include: { provider: true },
        });

        const results = [];
        for (const mapping of mappings) {
          try {
            const mappingResult = await syncManager.syncTaskList(mapping);
            results.push(mappingResult);
          } catch (error) {
            logger.error(
              `Failed to sync mapping ${mapping.id}`,
              {
                error:
                  error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          }
        }

        result = results.reduce(
          (acc, r) => {
            acc.imported += r.imported;
            acc.updated += r.updated;
            acc.deleted += r.deleted;
            acc.skipped += r.skipped;
            acc.errors.push(...r.errors);
            return acc;
          },
          {
            success: true,
            imported: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            errors: [] as Array<{ taskId: string; error: string }>,
          }
        );

        result.success = results.every((r) => r.success);
      }

      logger.info(
        `Manual sync completed for user ${userId}`,
        {
          userId,
          providerId: providerId || null,
          mappingId: mappingId || null,
          direction,
          result: result ? JSON.stringify(result) : null,
        },
        LOG_SOURCE
      );

      return NextResponse.json({ message: "Sync completed", result });
    } catch (error) {
      logger.error(
        "Error during sync",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );

      return NextResponse.json(
        {
          error: "Server error",
          message: "Failed to sync tasks",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error(
      "Error during sync request",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      {
        error: "Server error",
        message: "Failed to process sync request",
      },
      { status: 500 }
    );
  }
}

/**
 * Status check not needed in OS version (sync is synchronous).
 */
export async function GET(_req?: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "Status check is not needed in open source version as sync is handled synchronously",
    },
    { status: 501 }
  );
}
