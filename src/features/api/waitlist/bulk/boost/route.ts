/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
const R = (_req?: NextRequest, _ctx?: unknown) => NextResponse.json({ error: "Not available" }, { status: 404 });
export { R as GET, R as POST, R as PUT, R as PATCH, R as DELETE };
