import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AreaAPI";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const area = await prisma.area.findFirst({
    where: { id, userId: auth.userId },
    include: {
      projects: { orderBy: { name: "asc" } },
      schedule: { select: { id: true, name: true, color: true } },
    },
  });

  if (!area) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  return NextResponse.json(area);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const { name, icon, color, scheduleId } = await request.json();

    const existing = await prisma.area.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    const area = await prisma.area.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(icon !== undefined ? { icon } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(scheduleId !== undefined
          ? scheduleId
            ? { schedule: { connect: { id: scheduleId } } }
            : { schedule: { disconnect: true } }
          : {}),
      },
      include: {
        schedule: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json(area);
  } catch (error) {
    console.error("Area update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { id } = await params;

    const area = await prisma.area.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!area) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    // Unassign projects (don't delete them)
    await prisma.$transaction([
      prisma.project.updateMany({
        where: { areaId: id },
        data: { areaId: null },
      }),
      prisma.area.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Area delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
