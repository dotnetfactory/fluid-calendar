import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-sync-providers-api";

// Schema for creating a new task provider
const createProviderSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["OUTLOOK", "GOOGLE", "CALDAV"]),
  accountId: z.string().optional(), // Keep this for UI data, but don't pass to Prisma
  syncEnabled: z.boolean().default(true),
  defaultProjectId: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * GET /api/task-sync/providers
 * Get all task providers for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get all providers for the user
    const providers = await prisma.taskProvider.findMany({
      where: {
        userId,
      },
    });

    return NextResponse.json(providers);
  } catch (error) {
    logger.error(
      "Failed to get task providers",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to get task providers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/task-sync/providers
 * Create a new task provider
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = createProviderSchema.parse(body);

    // Create the provider
    const provider = await prisma.taskProvider.create({
      data: {
        name: validatedData.name,
        type: validatedData.type,
        userId,
        syncEnabled: validatedData.syncEnabled,
        defaultProjectId: validatedData.defaultProjectId,
        accountId: validatedData.accountId,
        settings: validatedData.settings
          ? JSON.parse(JSON.stringify(validatedData.settings))
          : undefined,
      },
    });

    return NextResponse.json(
      {
        provider: {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          syncEnabled: provider.syncEnabled,
          defaultProjectId: provider.defaultProjectId,
          accountId: provider.accountId,
          createdAt: provider.createdAt,
          updatedAt: provider.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "Failed to create task provider",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create task provider" },
      { status: 500 }
    );
  }
}
