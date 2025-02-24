import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { OutlookTasksService } from "@/lib/outlook-tasks";
import { logger } from "@/lib/logger";
import { newDate } from "@/lib/date-utils";

const LOG_SOURCE = "OutlookTasksImportAPI";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId, listId, projectId, options, isAutoScheduled } = body;

    if (!accountId || !listId) {
      return NextResponse.json(
        { error: "Account ID and List ID are required" },
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

    // Initialize service
    const client = await getOutlookClient(accountId);
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
      options
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
        error,
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to import tasks" },
      { status: 500 }
    );
  }
}
