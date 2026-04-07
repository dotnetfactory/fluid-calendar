import { NextRequest, NextResponse } from "next/server";

import { isSaasEnabled } from "@/lib/config";

export async function GET(req: NextRequest) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/subscription/status/route");
  return handler.GET(req);
}
