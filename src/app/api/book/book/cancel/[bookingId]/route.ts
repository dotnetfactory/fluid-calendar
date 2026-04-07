import { NextRequest, NextResponse } from "next/server";

import { isSaasEnabled } from "@/lib/config";

export async function POST(req: NextRequest, context: { params: Promise<{ bookingId: string }> }) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/book/book/cancel/[bookingId]/route");
  return handler.POST(req, context);
}
