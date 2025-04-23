import { NextResponse } from "next/server";

import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // Delete all expired logs
    const { count } = await prisma.log.deleteMany({
      where: {
        expiresAt: {
          lt: newDate(),
        },
      },
    });

    return NextResponse.json({
      message: `Cleaned up ${count} expired logs`,
      count,
    });
  } catch (error) {
    console.error("Failed to cleanup logs:", error);
    return NextResponse.json(
      { error: "Failed to cleanup logs" },
      { status: 500 }
    );
  }
}
