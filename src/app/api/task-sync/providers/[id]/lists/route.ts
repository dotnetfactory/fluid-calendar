import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { getMsGraphClient } from "@/lib/outlook-utils";
import { prisma } from "@/lib/prisma";
import { OutlookTaskProvider } from "@/lib/task-sync/providers/outlook-provider";
import { TaskProviderInterface } from "@/lib/task-sync/providers/task-provider.interface";

const LOG_SOURCE = "task-sync-provider-lists-api";

/**
 * GET /api/task-sync/providers/[id]/lists
 * Get task lists for a provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const paramData = await params;
    id = paramData.id;

    // Get the provider
    const provider = await prisma.taskProvider.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        account: true,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    if (!provider.account) {
      return NextResponse.json(
        { error: "Provider has no associated account" },
        { status: 400 }
      );
    }

    // Get task mappings for this provider
    const mappings = await prisma.taskListMapping.findMany({
      where: {
        providerId: provider.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Initialize the appropriate provider implementation
    let providerImpl: TaskProviderInterface;

    if (provider.type === "OUTLOOK") {
      // Get the MS Graph client for this account
      const graphClient = await getMsGraphClient(provider.account.id);
      providerImpl = new OutlookTaskProvider(graphClient, provider.account.id);
    } else if (provider.type === "GOOGLE") {
      // Get Google Tasks client for this account
      const { getGoogleTasksClient, GoogleTaskProvider } = await import(
        "@/lib/task-sync/providers/google-provider"
      );
      const tasksClient = await getGoogleTasksClient(provider.account.id, provider.userId);
      providerImpl = new GoogleTaskProvider(tasksClient, provider.account.id, provider.userId);
    } else {
      return NextResponse.json(
        { error: `Provider type ${provider.type} not supported` },
        { status: 400 }
      );
    }

    // Get task lists from the provider
    const taskLists = await providerImpl.getTaskLists();

    // Enhance task lists with mapping information
    const enhancedLists = taskLists.map((list) => {
      const mapping = mappings.find((m) => m.externalListId === list.id);
      return {
        id: list.id,
        name: list.name,
        isDefaultFolder: list.isDefault,
        isMapped: !!mapping,
        mappingId: mapping?.id,
        projectId: mapping?.projectId,
        projectName: mapping?.project?.name,
        lastSyncedAt: mapping?.lastSyncedAt,
        mappingDirection: mapping?.direction || "incoming",
      };
    });

    return NextResponse.json(enhancedLists);
  } catch (error) {
    logger.error(
      "Failed to get task lists",
      {
        error: error instanceof Error ? error.message : String(error),
        providerId: id,
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to get task lists" },
      { status: 500 }
    );
  }
}
