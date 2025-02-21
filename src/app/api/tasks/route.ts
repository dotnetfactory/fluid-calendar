import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TaskStatus, EnergyLevel, TimePreference } from "@/types/task";
import { RRule } from "rrule";
import { newDate } from "@/lib/date-utils";

export async function GET(request: Request) {
  try {
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

    const tasks = await prisma.task.findMany({
      where: {
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
    console.error("Error fetching tasks:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { tagIds, recurrenceRule, ...taskData } = json;

    // Validate recurrence rule if provided
    if (recurrenceRule) {
      try {
        // Attempt to parse the RRule string to validate it
        RRule.fromString(recurrenceRule);
      } catch {
        return new NextResponse("Invalid recurrence rule", { status: 400 });
      }
    }

    const task = await prisma.task.create({
      data: {
        ...taskData,
        isRecurring: !!recurrenceRule,
        recurrenceRule,
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
    console.error("Error creating task:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
