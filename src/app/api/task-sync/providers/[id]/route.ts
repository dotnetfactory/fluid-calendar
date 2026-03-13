import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-sync-provider-api";

// Schema for updating a task provider
const updateProviderSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  syncEnabled: z.boolean().optional(),
  defaultProjectId: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

/**
 * GET /api/task-sync/providers/[id]
 * Get a task provider by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the provider with the account and mappings
    const provider = await prisma.taskProvider.findUnique({
      where: {
        id: id,
        userId,
      },
      include: {
        account: {
          select: {
            provider: true,
          },
        },
        mappings: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Create a properly typed response object
    const responseProvider = {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      syncEnabled: provider.syncEnabled,
      defaultProjectId: provider.defaultProjectId,
      accountId: provider.accountId,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      accountProvider: provider.account?.provider,
      mappingsCount: provider.mappings.length,
    };

    return NextResponse.json({
      provider: responseProvider,
    });
  } catch (error) {
    logger.error(
      "Failed to get task provider",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to get task provider" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/task-sync/providers/[id]
 * Update a task provider
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Validate the provider ID
    const providerId = id;
    if (!providerId) {
      return NextResponse.json(
        { error: "Provider ID is required" },
        { status: 400 }
      );
    }

    // Check if the provider exists and belongs to the user
    const provider = await prisma.taskProvider.findUnique({
      where: {
        id: providerId,
        userId,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found or does not belong to the user" },
        { status: 404 }
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = updateProviderSchema.parse(body);

    // Update the provider
    const updatedProvider = await prisma.taskProvider.update({
      where: {
        id: providerId,
      },
      data: {
        name: validatedData.name,
        syncEnabled: validatedData.syncEnabled,
        defaultProjectId: validatedData.defaultProjectId,
      },
    });

    return NextResponse.json({
      provider: updatedProvider,
    });
  } catch (error) {
    logger.error(
      "Failed to update task provider",
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
      { error: "Failed to update task provider" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/task-sync/providers/[id]
 * Delete a task provider
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Verify the provider exists and belongs to the user
    const existingProvider = await prisma.taskProvider.findUnique({
      where: {
        id: id,
        userId,
      },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Delete the provider
    await prisma.taskProvider.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Provider deleted successfully",
    });
  } catch (error) {
    logger.error(
      "Failed to delete task provider",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to delete task provider" },
      { status: 500 }
    );
  }
}
