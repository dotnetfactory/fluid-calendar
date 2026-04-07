import { NextRequest, NextResponse } from "next/server";

import { isSaasEnabled } from "@/lib/config";

export async function GET(req: NextRequest, context: { params: Promise<{ username: string; slug: string }> }) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/book/book/[username]/[slug]/route");
  return handler.GET(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ username: string; slug: string }> }) {
  if (!isSaasEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const handler = await import("@saas/api/book/book/[username]/[slug]/route");
  return handler.POST(req, context);
}
