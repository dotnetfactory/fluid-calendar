import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AreasAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const areas = await prisma.area.findMany({
    where: { userId: auth.userId },
    include: {
      schedule: { select: { id: true, name: true, color: true } },
      _count: { select: { projects: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(areas);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { name, icon, color, scheduleId } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const area = await prisma.area.create({
      data: {
        userId: auth.userId,
        name: name.trim(),
        icon: icon || null,
        color: color || null,
        scheduleId: scheduleId || null,
      },
      include: {
        schedule: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json(area, { status: 201 });
  } catch (error) {
    console.error("Area create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
