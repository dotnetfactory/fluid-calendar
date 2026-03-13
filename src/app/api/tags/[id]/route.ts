import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "tag-route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const tag = await prisma.tag.findUnique({
      where: {
        id,
        // Ensure the tag belongs to the current user
        userId,
      },
    });

    if (!tag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    logger.error(
      "Error fetching tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const tag = await prisma.tag.findUnique({
      where: {
        id,
        // Ensure the tag belongs to the current user
        userId,
      },
    });

    if (!tag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    const json = await request.json();
    const { name, color } = json;

    // Check if another tag with the same name exists for this user
    if (name && name !== tag.name) {
      const existingTag = await prisma.tag.findFirst({
        where: {
          name,
          id: { not: id }, // Exclude current tag
          userId, // Only check tags belonging to the current user
        },
      });

      if (existingTag) {
        return new NextResponse("Tag with this name already exists", {
          status: 400,
        });
      }
    }

    const updatedTag = await prisma.tag.update({
      where: {
        id,
        // Ensure the tag belongs to the current user
        userId,
      },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    logger.error(
      "Error updating tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { id } = await params;
    const tag = await prisma.tag.findUnique({
      where: {
        id,
        // Ensure the tag belongs to the current user
        userId,
      },
    });

    if (!tag) {
      return new NextResponse("Tag not found", { status: 404 });
    }

    await prisma.tag.delete({
      where: {
        id,
        // Ensure the tag belongs to the current user
        userId,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(
      "Error deleting tag:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
