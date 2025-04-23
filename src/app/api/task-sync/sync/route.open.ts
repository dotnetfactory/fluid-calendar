import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { TaskSyncManager } from "@/lib/task-sync/task-sync-manager";

// Log source for this file
const LOG_SOURCE = "TaskSyncAPI";

// Schema for validating the sync request
const syncRequestSchema = z.object({
  // Either providerId or mappingId must be provided
  providerId: z.string().optional(),
  mappingId: z.string().optional(),
  // Optional direction parameter
  direction: z
    .enum(["incoming", "outgoing", "bidirectional"])
    .optional()
    .default("bidirectional"),
});

// Add a utility function to validate the direction parameter
function isValidDirection(
  direction: string
): direction is "incoming" | "outgoing" | "bidirectional" {
  return ["incoming", "outgoing", "bidirectional"].includes(direction);
}

/**
 * POST /api/task-sync/sync
 * Triggers a sync for a specific provider or mapping
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      // If response exists, authentication failed
      return auth.response as NextResponse;
    }

    const userId = auth.userId;

    // Parse the request body
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

    // Validate the direction parameter
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

    // Ensure at least one of providerId or mappingId is provided
    if (!providerId && !mappingId) {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Please provide either providerId or mappingId",
        },
        { status: 400 }
      );
    }

    // Initialize the sync manager
    const syncManager = new TaskSyncManager();

    try {
      let result;

      if (mappingId) {
        // If mappingId is provided, sync that specific mapping
        const mapping = await prisma.taskListMapping.findFirst({
          where: {
            id: mappingId,
            provider: {
              userId,
            },
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

        // Use the mapping's direction if not explicitly provided
        if (!direction) {
          direction = mapping.direction as
            | "incoming"
            | "outgoing"
            | "bidirectional";
        }

        result = await syncManager.syncTaskList(mapping);
      } else if (providerId) {
        // If providerId is provided, sync all mappings for that provider
        const provider = await prisma.taskProvider.findFirst({
          where: {
            id: providerId,
            userId,
          },
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

        // Get all mappings for this provider
        const mappings = await prisma.taskListMapping.findMany({
          where: { providerId },
          include: { provider: true },
        });

        // Sync each mapping
        const results = [];
        for (const mapping of mappings) {
          try {
            const mappingResult = await syncManager.syncTaskList(mapping);
            results.push(mappingResult);
          } catch (error) {
            logger.error(
              `Failed to sync mapping ${mapping.id}`,
              {
                error: error instanceof Error ? error.message : "Unknown error",
              },
              LOG_SOURCE
            );
          }
        }

        // Calculate totals
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

        // Set success to false if any sync failed
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

      return NextResponse.json({
        message: "Sync completed",
        result,
      });
    } catch (error) {
      logger.error(
        "Error during sync",
        {
          error: error instanceof Error ? error.message : "Unknown error",
        },
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
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
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
 * GET /api/task-sync/sync/status?jobId=xxx
 * Gets the status of a sync job - not needed in open source version since sync is synchronous
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "Status check is not needed in open source version as sync is handled synchronously",
    },
    { status: 501 }
  );
}
