import { NextRequest, NextResponse } from "next/server";

import { isSaasEnabled } from "@/lib/config";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/waitlist/entries/[id]/route");
  return handler.GET(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/waitlist/entries/[id]/route");
  return handler.PATCH(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/waitlist/entries/[id]/route");
  return handler.DELETE(req, context);
}
