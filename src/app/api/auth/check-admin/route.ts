import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

const LOG_SOURCE = "CheckAdminAPI";

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      logger.info("No token found when checking admin status", {}, LOG_SOURCE);
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = token.role === "admin";
    logger.info("Checked if user is admin", { isAdmin }, LOG_SOURCE);

    return NextResponse.json({ isAdmin });
  } catch (error) {
    logger.error(
      "Error checking if user is admin",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to check admin status" },
      { status: 500 }
    );
  }
}
