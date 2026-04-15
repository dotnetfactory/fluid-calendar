import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "DayBlocksAPI";

/**
 * GET /api/day-blocks?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const blocks = await prisma.dayBlock.findMany({
    where: {
      userId: auth.userId,
      ...(start && end
        ? {
            date: {
              gte: new Date(start),
              lte: new Date(end),
            },
          }
        : {}),
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json(blocks);
}

/**
 * POST /api/day-blocks
 * Body: { date: "YYYY-MM-DD", type: "full_day" | "rest_of_day" }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { date, type } = await request.json();

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const dateObj = new Date(date);
    dateObj.setUTCHours(0, 0, 0, 0);

    const blockFrom = type === "rest_of_day" ? new Date() : null;

    const block = await prisma.dayBlock.upsert({
      where: {
        userId_date: {
          userId: auth.userId,
          date: dateObj,
        },
      },
      create: {
        userId: auth.userId,
        date: dateObj,
        blockFrom,
      },
      update: {
        blockFrom,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    console.error("DayBlock create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/day-blocks?date=YYYY-MM-DD
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const dateObj = new Date(date);
    dateObj.setUTCHours(0, 0, 0, 0);

    await prisma.dayBlock.deleteMany({
      where: { userId: auth.userId, date: dateObj },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
