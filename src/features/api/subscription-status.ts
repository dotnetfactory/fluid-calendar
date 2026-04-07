import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasActiveSubscription: false,
    plan: null,
    status: null,
  });
}
