import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "ScheduleAPI";

/**
 * GET /api/schedules/[id] — Get a single schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const schedule = await prisma.schedule.findFirst({
    where: { id, userId: auth.userId },
    include: { timeBlocks: { orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }] } },
  });

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  return NextResponse.json(schedule);
}

/**
 * PUT /api/schedules/[id] — Update a schedule (time blocks replaced wholesale)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const json = await request.json();
    const { timeBlocks, ...updates } = json;

    const existing = await prisma.schedule.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Don't allow renaming system schedule
    if (existing.isSystem && updates.name && updates.name !== existing.name) {
      return NextResponse.json(
        { error: "Cannot rename system schedule" },
        { status: 403 }
      );
    }

    // Update schedule and replace time blocks in a transaction
    const schedule = await prisma.$transaction(async (tx) => {
      // Delete existing time blocks if new ones provided
      if (timeBlocks) {
        await tx.scheduleTimeBlock.deleteMany({ where: { scheduleId: id } });
      }

      return tx.schedule.update({
        where: { id },
        data: {
          ...updates,
          ...(timeBlocks
            ? {
                timeBlocks: {
                  create: timeBlocks.map((block: { dayOfWeek: number; startHour: number; startMinute?: number; endHour: number; endMinute?: number }) => ({
                    dayOfWeek: block.dayOfWeek,
                    startHour: block.startHour,
                    startMinute: block.startMinute ?? 0,
                    endHour: block.endHour,
                    endMinute: block.endMinute ?? 0,
                  })),
                },
              }
            : {}),
        },
        include: { timeBlocks: true },
      });
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Schedule update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/schedules/[id] — Delete a schedule
 * Reassigns all tasks and projects to the 24/7 system schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { id } = await params;

    const schedule = await prisma.schedule.findFirst({
      where: { id, userId: auth.userId },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (schedule.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system schedule" },
        { status: 403 }
      );
    }

    // Find the 24/7 system schedule for fallback
    const systemSchedule = await prisma.schedule.findFirst({
      where: { userId: auth.userId, isSystem: true },
    });

    if (!systemSchedule) {
      return NextResponse.json(
        { error: "System schedule not found" },
        { status: 500 }
      );
    }

    // Reassign tasks and projects, then delete (in transaction)
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { scheduleId: id },
        data: { scheduleId: systemSchedule.id },
      }),
      prisma.project.updateMany({
        where: { scheduleId: id },
        data: { scheduleId: systemSchedule.id },
      }),
      prisma.schedule.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Schedule delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
