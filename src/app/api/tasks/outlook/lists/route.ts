import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { OutlookTasksService } from "@/lib/outlook-tasks";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "OutlookTaskListsAPI";

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get the account and ensure it belongs to the current user
    const account = await prisma.connectedAccount.findUnique({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account || account.provider !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Invalid Outlook account" },
        { status: 400 }
      );
    }

    // Initialize service and fetch task lists
    const client = await getOutlookClient(accountId, userId);
    const outlookService = new OutlookTasksService(client, accountId);
    const taskLists = await outlookService.getTaskLists();

    // Get existing mappings
    const mappings = await prisma.outlookTaskListMapping.findMany({
      where: {
        externalListId: {
          in: taskLists.map((list) => list.id),
        },
        project: {
          userId: userId,
        },
      },
      include: {
        project: true,
      },
    });

    // Transform task lists to include mapping information
    const availableLists = taskLists.map((list) => {
      const mapping = mappings.find((m) => m.externalListId === list.id);
      return {
        id: list.id,
        name: list.name,
        isDefaultFolder: list.isDefaultFolder,
        projectMapping: mapping
          ? {
              projectId: mapping.projectId,
              projectName: mapping.project.name,
              lastImported: mapping.lastImported,
              isAutoScheduled: mapping.isAutoScheduled,
            }
          : undefined,
      };
    });

    return NextResponse.json(availableLists);
  } catch (error) {
    logger.error(
      "Failed to list available task lists",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to list task lists" },
      { status: 500 }
    );
  }
}
