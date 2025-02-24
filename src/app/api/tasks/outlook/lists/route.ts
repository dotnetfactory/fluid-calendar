import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { OutlookTasksService } from "@/lib/outlook-tasks";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "OutlookTaskListsAPI";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    // Get the account
    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== "OUTLOOK") {
      return NextResponse.json(
        { error: "Invalid Outlook account" },
        { status: 400 }
      );
    }

    // Initialize service and fetch task lists
    const client = await getOutlookClient(accountId);
    const outlookService = new OutlookTasksService(client, accountId);
    const taskLists = await outlookService.getTaskLists();

    // Get existing mappings
    const mappings = await prisma.outlookTaskListMapping.findMany({
      where: {
        externalListId: {
          in: taskLists.map((list) => list.id),
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
        error,
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to list task lists" },
      { status: 500 }
    );
  }
}
