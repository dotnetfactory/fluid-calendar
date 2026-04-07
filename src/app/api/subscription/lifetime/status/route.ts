import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const handler = await import("@saas/api/subscription/lifetime/status/route");
  return handler.GET(req);
}
