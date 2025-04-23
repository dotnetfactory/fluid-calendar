import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-sync-mapping-api";

// Schema for mapping patch requests
const mappingPatchSchema = z.object({
  projectId: z.string().uuid().optional(),
  direction: z.enum(["incoming", "outgoing", "bidirectional"]).optional(),
  isAutoScheduled: z.boolean().optional(),
});

/**
 * GET /api/task-sync/mappings/[id]
 * Get a specific task list mapping
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response as NextResponse;
    }

    const userId = auth.userId;

    // Get the mapping
    const mapping = await prisma.taskListMapping.findUnique({
      where: {
        id: id,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
            userId: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            userId: true,
          },
        },
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    // Verify the mapping belongs to the user (via provider and project)
    if (
      mapping.provider.userId !== userId ||
      mapping.project.userId !== userId
    ) {
      return NextResponse.json(
        { error: "Unauthorized access to mapping" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      mapping: {
        id: mapping.id,
        providerId: mapping.providerId,
        providerName: mapping.provider.name,
        providerType: mapping.provider.type,
        externalListId: mapping.externalListId,
        externalListName: mapping.externalListName,
        projectId: mapping.projectId,
        projectName: mapping.project.name,
        projectColor: mapping.project.color,
        syncEnabled: mapping.syncEnabled,
        lastSyncedAt: mapping.lastSyncedAt,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to get task list mapping",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        mappingId: id,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to get task list mapping" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/task-sync/mappings/[id]
 * Updates a specific task list mapping
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const paramData = await params;

  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response as NextResponse;
    }

    const userId = auth.userId;
    const mappingId = paramData.id;

    // Get the mapping to check ownership
    const mapping = await prisma.taskListMapping.findFirst({
      where: {
        id: mappingId,
        provider: {
          userId,
        },
      },
      include: {
        provider: true,
      },
    });

    if (!mapping) {
      return NextResponse.json(
        { error: "Task list mapping not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = mappingPatchSchema.parse(body);

    // Create an update object only with fields that are provided
    type UpdateData = {
      projectId?: string;
      direction?: "incoming" | "outgoing" | "bidirectional";
      isAutoScheduled?: boolean;
    };

    const updateData: UpdateData = {};
    if (validatedData.projectId !== undefined) {
      updateData.projectId = validatedData.projectId;
    }
    if (validatedData.direction !== undefined) {
      updateData.direction = validatedData.direction;
    }
    if (validatedData.isAutoScheduled !== undefined) {
      updateData.isAutoScheduled = validatedData.isAutoScheduled;
    }

    // Update the mapping with only the provided fields
    const updatedMapping = await prisma.taskListMapping.update({
      where: {
        id: mappingId,
      },
      data: updateData,
    });

    logger.info(
      `Updated task list mapping ${mappingId}`,
      {
        mappingId,
        userId,
        projectId: validatedData.projectId || null,
        direction: validatedData.direction || null,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      message: "Task list mapping updated",
      mapping: {
        ...updatedMapping,
        projectName: updatedMapping.projectId
          ? (
              await prisma.project.findUnique({
                where: { id: updatedMapping.projectId },
              })
            )?.name
          : null,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to update task list mapping",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        mappingId: paramData.id,
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
      { error: "Failed to update task list mapping" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/task-sync/mappings/[id]
 * Delete a task list mapping
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response as NextResponse;
    }

    const userId = auth.userId;

    // Get the existing mapping
    const existingMapping = await prisma.taskListMapping.findUnique({
      where: {
        id: id,
      },
      include: {
        provider: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingMapping) {
      return NextResponse.json({ error: "Mapping not found" }, { status: 404 });
    }

    // Verify the mapping belongs to the user (via provider)
    if (existingMapping.provider.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to mapping" },
        { status: 403 }
      );
    }

    // Delete the mapping
    await prisma.taskListMapping.delete({
      where: {
        id: id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Mapping deleted successfully",
    });
  } catch (error) {
    logger.error(
      "Failed to delete task list mapping",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        mappingId: id,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to delete task list mapping" },
      { status: 500 }
    );
  }
}
