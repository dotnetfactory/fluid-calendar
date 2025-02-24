import { NextResponse } from "next/server";
import { ServerLogger } from "@/lib/logger/server";
import { LogEntry } from "@/lib/logger/types";

export async function POST(request: Request) {
  try {
    const entries = (await request.json()) as LogEntry[];

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const logger = new ServerLogger();
    const result = await logger.writeBatch(entries);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to process batch logs:", error);
    return NextResponse.json(
      { error: "Failed to process logs" },
      { status: 500 }
    );
  }
}
