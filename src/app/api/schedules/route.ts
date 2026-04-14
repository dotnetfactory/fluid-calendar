import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "SchedulesAPI";

/**
 * GET /api/schedules — List all schedules for the user
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const schedules = await prisma.schedule.findMany({
    where: { userId: auth.userId },
    include: { timeBlocks: { orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }] } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  });

  return NextResponse.json(schedules);
}

/**
 * POST /api/schedules — Create a new schedule
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const json = await request.json();
    const { name, timezone, color, selectedCalendars, bufferMinutes, timeBlocks, ...rest } = json;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        userId: auth.userId,
        name: name.trim(),
        timezone: timezone || "America/New_York",
        color: color || null,
        selectedCalendars: selectedCalendars || "[]",
        bufferMinutes: bufferMinutes ?? 15,
        highEnergyStart: rest.highEnergyStart ?? null,
        highEnergyEnd: rest.highEnergyEnd ?? null,
        mediumEnergyStart: rest.mediumEnergyStart ?? null,
        mediumEnergyEnd: rest.mediumEnergyEnd ?? null,
        lowEnergyStart: rest.lowEnergyStart ?? null,
        lowEnergyEnd: rest.lowEnergyEnd ?? null,
        timeBlocks: timeBlocks
          ? {
              create: timeBlocks.map((block: { dayOfWeek: number; startHour: number; startMinute?: number; endHour: number; endMinute?: number }) => ({
                dayOfWeek: block.dayOfWeek,
                startHour: block.startHour,
                startMinute: block.startMinute ?? 0,
                endHour: block.endHour,
                endMinute: block.endMinute ?? 0,
              })),
            }
          : undefined,
      },
      include: { timeBlocks: true },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Schedule create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
