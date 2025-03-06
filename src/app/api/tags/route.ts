import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "tags-route";

export async function GET(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn("Unauthorized access attempt to tags API", {}, LOG_SOURCE);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const tags = await prisma.tag.findMany({
      where: {
        // Filter by the current user's ID
        userId,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    logger.error(
      "Error fetching tags:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn("Unauthorized access attempt to create tag", {}, LOG_SOURCE);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const body = await request.json();
    logger.debug("Received tag creation request", { body }, LOG_SOURCE);

    if (!body || typeof body.name !== "string" || !body.name.trim()) {
      logger.warn(
        "Tag validation failed",
        {
          hasBody: !!body,
          nameType: typeof body?.name,
          nameTrimmed: body?.name?.trim?.(),
        },
        LOG_SOURCE
      );
      return new NextResponse(
        JSON.stringify({
          error: "Name is required",
          details: {
            hasBody: !!body,
            nameType: typeof body?.name,
            receivedName: body?.name,
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const name = body.name.trim();
    const color = body.color;

    // Check if tag with same name already exists for this user
    const existingTag = await prisma.tag.findFirst({
      where: {
        name,
        userId,
      },
    });

    if (existingTag) {
      return new NextResponse(
        JSON.stringify({ error: "Tag with this name already exists" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        // Associate the tag with the current user
        userId,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    logger.error(
      "Error creating tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
