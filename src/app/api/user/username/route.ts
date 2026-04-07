import { NextRequest, NextResponse } from "next/server";

import { isSaasEnabled } from "@/lib/config";

export async function GET(req: NextRequest) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/user/username/route");
  return handler.GET(req);
}

export async function PATCH(req: NextRequest) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/user/username/route");
  return handler.PATCH(req);
}

export async function POST(req: NextRequest) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/user/username/route");
  return handler.POST(req);
}
