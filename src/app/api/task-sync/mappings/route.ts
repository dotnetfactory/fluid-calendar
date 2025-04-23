import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "task-sync-mapping-api";

// Schema for creating a new task list mapping
const createMappingSchema = z.object({
  providerId: z.string().min(1),
  externalListId: z.string().min(1),
  externalListName: z.string().min(1),
  projectId: z.string().min(1),
  syncEnabled: z.boolean().optional().default(true),
  direction: z
    .enum(["incoming", "outgoing", "bidirectional"])
    .optional()
    .default("incoming"),
});

/**
 * GET /api/task-sync/mappings
 * Get all task list mappings for the user
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const providerId = searchParams.get("providerId");

    // Get mappings with optional provider filter
    const mappings = await prisma.taskListMapping.findMany({
      where: {
        provider: {
          userId,
          ...(providerId ? { id: providerId } : {}),
        },
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      mappings: mappings.map((mapping) => ({
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
      })),
    });
  } catch (error) {
    logger.error(
      "Failed to get task list mappings",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to get task list mappings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/task-sync/mappings
 * Create a new task list mapping
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
    const validatedData = createMappingSchema.parse(body);

    // Verify the provider exists and belongs to the user
    const provider = await prisma.taskProvider.findUnique({
      where: {
        id: validatedData.providerId,
        userId,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found or does not belong to the user" },
        { status: 404 }
      );
    }

    // Verify the project exists and belongs to the user
    const project = await prisma.project.findUnique({
      where: {
        id: validatedData.projectId,
        userId,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or does not belong to the user" },
        { status: 404 }
      );
    }

    // Check if a mapping already exists for this external list
    const existingMapping = await prisma.taskListMapping.findFirst({
      where: {
        providerId: validatedData.providerId,
        externalListId: validatedData.externalListId,
      },
    });

    if (existingMapping) {
      return NextResponse.json(
        { error: "A mapping already exists for this external list" },
        { status: 409 }
      );
    }

    // Create the mapping
    const mapping = await prisma.taskListMapping.create({
      data: {
        providerId: validatedData.providerId,
        externalListId: validatedData.externalListId,
        externalListName: validatedData.externalListName,
        projectId: validatedData.projectId,
        syncEnabled: validatedData.syncEnabled,
        direction: validatedData.direction,
      },
      include: {
        provider: {
          select: {
            name: true,
            type: true,
          },
        },
        project: {
          select: {
            name: true,
            color: true,
          },
        },
      },
    });

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
        direction: mapping.direction,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      },
    });
  } catch (error) {
    logger.error(
      "Failed to create task list mapping",
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
      { error: "Failed to create task list mapping" },
      { status: 500 }
    );
  }
}
