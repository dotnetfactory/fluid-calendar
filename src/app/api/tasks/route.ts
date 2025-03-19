import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RRule } from "rrule";
import { TaskStatus, EnergyLevel, TimePreference } from "@/types/task";
import { newDate } from "@/lib/date-utils";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

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

    const json = await request.json();
    const { tagIds, recurrenceRule, ...taskData } = json;

    // Normalize and validate recurrence rule if provided
    const standardizedRecurrenceRule = recurrenceRule
      ? normalizeRecurrenceRule(recurrenceRule)
      : undefined;

    if (standardizedRecurrenceRule) {
      try {
        // Attempt to parse the standardized RRule string to validate it
        RRule.fromString(standardizedRecurrenceRule);
      } catch (error) {
        logger.error(
          "Error parsing recurrence rule:",
          {
            error: error instanceof Error ? error.message : String(error),
          },
          LOG_SOURCE
        );
        return new NextResponse("Invalid recurrence rule", { status: 400 });
      }
    }

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

    return NextResponse.json(task);
  } catch (error) {
    logger.error(
      "Error creating task:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
