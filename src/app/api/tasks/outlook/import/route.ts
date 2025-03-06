import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { OutlookTasksService } from "@/lib/outlook-tasks";
import { logger } from "@/lib/logger";
import { newDate } from "@/lib/date-utils";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "OutlookTasksImportAPI";

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const body = await request.json();
    const { accountId, listId, projectId, options, isAutoScheduled } = body;

    if (!accountId || !listId) {
      return NextResponse.json(
        { error: "Account ID and List ID are required" },
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

    // Initialize service
    const client = await getOutlookClient(accountId, userId);
    const outlookService = new OutlookTasksService(client, accountId);

    // Get or create project if not provided
    let targetProjectId = projectId;
    if (!targetProjectId) {
      // Get task list details to use as project name
      const taskLists = await outlookService.getTaskLists();
      const taskList = taskLists.find((list) => list.id === listId);
      if (!taskList) {
        return NextResponse.json(
          { error: "Task list not found" },
          { status: 404 }
        );
      }

      // Create new project
      const project = await prisma.project.create({
        data: {
          name: taskList.name,
          description: `Imported from Outlook task list: ${taskList.name}`,
          status: "active",
          userId, // Associate with the current user
        },
      });
      targetProjectId = project.id;

      // Create mapping
      await prisma.outlookTaskListMapping.create({
        data: {
          externalListId: listId,
          projectId: targetProjectId,
          name: taskList.name,
          lastImported: newDate(),
          isAutoScheduled: isAutoScheduled ?? true,
        },
      });
    } else {
      // Verify the project belongs to the current user
      const project = await prisma.project.findUnique({
        where: {
          id: targetProjectId,
          userId,
        },
      });

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      // Update existing mapping's isAutoScheduled setting
      await prisma.outlookTaskListMapping.update({
        where: { externalListId: listId },
        data: {
          isAutoScheduled: isAutoScheduled ?? true,
          lastImported: newDate(),
        },
      });
    }

    // Import tasks
    const results = await outlookService.importTasksToProject(
      listId,
      targetProjectId,
      options,
      userId // Pass userId to ensure tasks are associated with the current user
    );

    // Get task list name for failed tasks
    const taskLists = await outlookService.getTaskLists();
    const taskList = taskLists.find((list) => list.id === listId);
    const failedTasks = results.errors?.map((error) => ({
      taskId: error.taskId,
      name: error.taskId, // Using taskId as name since we don't have the task name
      error: error.error,
      listName: taskList?.name || "Unknown List",
    }));

    return NextResponse.json({
      imported: results.imported,
      skipped: results.skipped,
      failed: results.failed,
      failedTasks,
      projectId: targetProjectId,
    });
  } catch (error) {
    logger.error(
      "Failed to import Outlook tasks",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to import tasks" },
      { status: 500 }
    );
  }
}
