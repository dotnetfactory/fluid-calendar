import { NextResponse } from "next/server";

import { checkSetupStatus } from "@/lib/setup-actions";

/**
 * GET /api/setup/check
 * Checks if any users exist in the database
 * Used by middleware to determine if setup is needed
 */
export async function GET() {
  try {
    const result = await checkSetupStatus();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check if users exist", details: error },
      { status: 500 }
    );
  }
}
