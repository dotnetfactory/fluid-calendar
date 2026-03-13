import { NextRequest, NextResponse } from "next/server";

import { RRule } from "rrule";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  ChangeType,
  TaskChangeTracker,
} from "@/lib/task-sync/task-change-tracker";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";

import { EnergyLevel, TaskStatus, TimePreference } from "@/types/task";

const LOG_SOURCE = "tasks-route";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.getAll("status") as TaskStatus[];
    const tagIds = searchParams.getAll("tagIds");
    const energyLevel = searchParams.getAll("energyLevel") as EnergyLevel[];
    const timePreference = searchParams.getAll(
      "timePreference"
    ) as TimePreference[];
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const taskStartDate = searchParams.get("taskStartDate");
    const hideUpcomingTasks = searchParams.get("hideUpcomingTasks") === "true";

    const now = newDate();
    const tasks = await prisma.task.findMany({
      where: {
        // Filter by the current user's ID
        userId,
        ...(status.length > 0 && { status: { in: status } }),
        ...(energyLevel.length > 0 && { energyLevel: { in: energyLevel } }),
        ...(timePreference.length > 0 && {
          preferredTime: { in: timePreference },
        }),
        ...(tagIds.length > 0 && { tags: { some: { id: { in: tagIds } } } }),
        ...(search && {
          OR: [
            { title: { contains: search } },
            { description: { contains: search } },
          ],
        }),
        ...(startDate &&
          endDate && {
            dueDate: {
              gte: newDate(startDate),
              lte: newDate(endDate),
            },
          }),
        ...(taskStartDate && {
          startDate: {
            gte: newDate(taskStartDate),
          },
        }),
        ...(hideUpcomingTasks && {
          OR: [{ startDate: null }, { startDate: { lte: now } }],
        }),
      },
      include: {
        tags: true,
        project: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    logger.error(
      "Error fetching tasks:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const userAgent = request.headers.get("user-agent") || "unknown";
    const sourceIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const referer = request.headers.get("referer") || "unknown";
    const requestId = Math.random().toString(36).substring(2, 15);

    // Get the full stack trace to understand where this request originated from
    const stackTrace = new Error().stack;

    const json = await request.json();
    const { tagIds, recurrenceRule, ...taskData } = json;

    logger.info(
      "📥 TASK CREATION REQUEST RECEIVED",
      {
        request_id: requestId,
        userId,
        title: taskData.title,
        description: taskData.description || "none",
        status: taskData.status || "todo",
        isRecurring: !!recurrenceRule,
        recurrenceRule: recurrenceRule || "none",
        projectId: taskData.projectId || "none",
        sourceIP,
        userAgent,
        referer,
        requestHeaders: JSON.stringify(
          Object.fromEntries(request.headers.entries())
        ),
        requestBody: JSON.stringify(json),
        stackTrace:
          stackTrace?.split("\n").slice(0, 10).join("\n") || "No stack trace",
        creationMethod: "API_POST_REQUEST",
        dueDate: taskData.dueDate || "none",
        startDate: taskData.startDate || "none",
        priority: taskData.priority || "none",
        energyLevel: taskData.energyLevel || "none",
        source: taskData.source || "none",
        externalTaskId: taskData.externalTaskId || "none",
      },
      LOG_SOURCE
    );

    // Log all request headers for debugging
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });

    logger.info(
      "🔍 TASK CREATION REQUEST HEADERS ANALYSIS",
      {
        request_id: requestId,
        userId,
        allHeaders: JSON.stringify(allHeaders),
        contentType: request.headers.get("content-type"),
        origin: request.headers.get("origin"),
        host: request.headers.get("host"),
        xForwardedFor: request.headers.get("x-forwarded-for"),
        xRealIp: request.headers.get("x-real-ip"),
        authorization: request.headers.get("authorization")
          ? "present"
          : "missing",
      },
      LOG_SOURCE
    );

    // Normalize and validate recurrence rule if provided
    const standardizedRecurrenceRule = recurrenceRule
      ? normalizeRecurrenceRule(recurrenceRule)
      : undefined;

    if (standardizedRecurrenceRule) {
      try {
        // Attempt to parse the standardized RRule string to validate it
        RRule.fromString(standardizedRecurrenceRule);

        logger.info(
          "✅ RECURRENCE RULE VALIDATION SUCCESS",
          {
            request_id: requestId,
            userId,
            originalRule: recurrenceRule,
            standardizedRule: standardizedRecurrenceRule,
          },
          LOG_SOURCE
        );
      } catch (error) {
        logger.error(
          "❌ RECURRENCE RULE VALIDATION FAILED",
          {
            request_id: requestId,
            userId,
            originalRule: recurrenceRule,
            standardizedRule: standardizedRecurrenceRule,
            error: error instanceof Error ? error.message : String(error),
          },
          LOG_SOURCE
        );
        return new NextResponse("Invalid recurrence rule", { status: 400 });
      }
    }

    // Check for duplicate recurring task to prevent duplicate creations
    if (recurrenceRule && taskData.title) {
      logger.info(
        "🔍 CHECKING FOR DUPLICATE RECURRING TASKS",
        {
          request_id: requestId,
          userId,
          title: taskData.title,
          projectId: taskData.projectId || "none",
          isRecurring: true,
        },
        LOG_SOURCE
      );

      const existingTask = await prisma.task.findFirst({
        where: {
          title: taskData.title,
          isRecurring: true,
          userId,
          projectId: taskData.projectId || undefined,
        },
      });

      if (existingTask) {
        logger.warn(
          "⚠️ DUPLICATE RECURRING TASK CREATION ATTEMPT DETECTED",
          {
            request_id: requestId,
            existingTaskId: existingTask.id,
            title: taskData.title,
            projectId: taskData.projectId || "none",
            userId,
            userAgent,
            recurrenceRule: recurrenceRule,
            existingTaskCreatedAt: existingTask.createdAt.toISOString(),
            existingTaskRecurrenceRule: existingTask.recurrenceRule,
            potentialDuplicateReason: "SAME_TITLE_RECURRING_PROJECT_USER",
          },
          LOG_SOURCE
        );
      } else {
        logger.info(
          "✅ NO DUPLICATE RECURRING TASK FOUND",
          {
            request_id: requestId,
            userId,
            title: taskData.title,
            projectId: taskData.projectId || "none",
          },
          LOG_SOURCE
        );
      }
    }

    // Find the project's task mapping if it exists
    let mappingId = null;
    if (taskData.projectId) {
      logger.info(
        "🔍 CHECKING FOR TASK LIST MAPPING",
        {
          request_id: requestId,
          userId,
          projectId: taskData.projectId,
        },
        LOG_SOURCE
      );

      const mapping = await prisma.taskListMapping.findFirst({
        where: {
          projectId: taskData.projectId,
        },
      });

      if (mapping) {
        mappingId = mapping.id;
        logger.info(
          "✅ TASK LIST MAPPING FOUND",
          {
            request_id: requestId,
            userId,
            projectId: taskData.projectId,
            mappingId: mapping.id,
            externalListId: mapping.externalListId,
            providerId: mapping.providerId,
            syncEnabled: mapping.syncEnabled,
          },
          LOG_SOURCE
        );
      } else {
        logger.info(
          "ℹ️ NO TASK LIST MAPPING FOUND",
          {
            request_id: requestId,
            userId,
            projectId: taskData.projectId,
          },
          LOG_SOURCE
        );
      }
    }

    logger.info(
      "🚀 CREATING TASK IN DATABASE",
      {
        request_id: requestId,
        userId,
        taskDataForCreation: {
          ...taskData,
          userId,
          isRecurring: !!recurrenceRule,
          recurrenceRule: standardizedRecurrenceRule,
          hasTagIds: !!tagIds,
          tagIdsCount: tagIds ? tagIds.length : 0,
        },
        mappingId: mappingId || "none",
        timestamp: new Date().toISOString(),
      },
      LOG_SOURCE
    );

    const task = await prisma.task.create({
      data: {
        ...taskData,
        // Associate the task with the current user
        userId,
        isRecurring: !!recurrenceRule,
        recurrenceRule: standardizedRecurrenceRule,
        ...(tagIds && {
          tags: {
            connect: tagIds.map((id: string) => ({ id })),
          },
        }),
      },
      include: {
        tags: true,
        project: true,
      },
    });

    logger.info(
      "✅ TASK CREATED SUCCESSFULLY IN DATABASE",
      {
        request_id: requestId,
        taskId: task.id,
        title: task.title,
        description: task.description || "none",
        status: task.status,
        isRecurring: task.isRecurring,
        recurrenceRule: task.recurrenceRule || "none",
        projectId: task.projectId || "none",
        projectName: task.project?.name || "none",
        userId,
        createdFrom: userAgent,
        sourceIP,
        referer,
        dueDate: task.dueDate?.toISOString() || "none",
        startDate: task.startDate?.toISOString() || "none",
        priority: task.priority || "none",
        energyLevel: task.energyLevel || "none",
        source: task.source || "none",
        externalTaskId: task.externalTaskId || "none",
        tagCount: task.tags.length,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
      LOG_SOURCE
    );

    // Track the creation for sync purposes if the task is in a mapped project
    if (mappingId) {
      logger.info(
        "🔄 TRACKING TASK CHANGE FOR SYNC",
        {
          request_id: requestId,
          taskId: task.id,
          mappingId,
          changeType: "CREATE",
          userId,
        },
        LOG_SOURCE
      );

      const changeTracker = new TaskChangeTracker();
      await changeTracker.trackChange(
        task.id,
        "CREATE" as ChangeType,
        userId,
        { task },
        undefined, // providerId will be determined later during sync
        mappingId
      );

      logger.info(
        "✅ TASK CHANGE TRACKED FOR SYNC",
        {
          request_id: requestId,
          taskId: task.id,
          mappingId,
          changeType: "CREATE",
        },
        LOG_SOURCE
      );
    }

    logger.info(
      "🎉 TASK CREATION PROCESS COMPLETED",
      {
        request_id: requestId,
        taskId: task.id,
        title: task.title,
        userId,
        totalProcessingTime: "calculated_in_response",
        finalStatus: "SUCCESS",
      },
      LOG_SOURCE
    );

    return NextResponse.json(task);
  } catch (error) {
    const errorId = Math.random().toString(36).substring(2, 15);

    logger.error(
      "💥 TASK CREATION ERROR",
      {
        errorId,
        error: error instanceof Error ? error.message : String(error),
        errorStack:
          error instanceof Error && error.stack
            ? error.stack
            : "No stack trace",
        userId: "unknown",
        timestamp: new Date().toISOString(),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
