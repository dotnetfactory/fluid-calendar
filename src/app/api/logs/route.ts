import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { newDate, subDays } from "@/lib/date-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const level = searchParams.get("level");
    const source = searchParams.get("source");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {};
    if (level) where.level = level;
    if (source) where.source = source;
    if (from || to) {
      where.timestamp = {};
      if (from) where.timestamp.gte = new Date(from);
      if (to) where.timestamp.lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { message: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get total count for pagination
    const total = await prisma.log.count({ where });

    // Get logs with pagination
    const logs = await prisma.log.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      logs,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        current: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThan = searchParams.get("olderThan"); // days
    const level = searchParams.get("level");

    const where: any = {};

    // Delete logs older than specified days
    if (olderThan) {
      where.timestamp = {
        lt: subDays(newDate(), parseInt(olderThan)),
      };
    }

    // Delete logs of specific level
    if (level) {
      where.level = level;
    }

    // Delete expired logs if no filters provided
    if (!olderThan && !level) {
      where.expiresAt = {
        lt: newDate(),
      };
    }

    const { count } = await prisma.log.deleteMany({ where });

    return NextResponse.json({
      message: `Deleted ${count} logs`,
      count,
    });
  } catch (error) {
    console.error("Failed to delete logs:", error);
    return NextResponse.json(
      { error: "Failed to delete logs" },
      { status: 500 }
    );
  }
}
