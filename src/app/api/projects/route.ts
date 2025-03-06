import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@/types/project";
import { getToken } from "next-auth/jwt";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "projects-route";

export async function GET(request: NextRequest) {
  try {
    // Get the user token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If there's no token, return unauthorized
    if (!token) {
      logger.warn(
        "Unauthorized access attempt to projects API",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const { searchParams } = new URL(request.url);
    const status = searchParams.getAll("status") as ProjectStatus[];
    const search = searchParams.get("search");

    const projects = await prisma.project.findMany({
      where: {
        // Filter by the current user's ID
        userId,
        ...(status.length > 0 && { status: { in: status } }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }),
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    logger.error(
      "Error fetching projects:",
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
      logger.warn(
        "Unauthorized access attempt to create project",
        {},
        LOG_SOURCE
      );
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = token.sub;

    const json = await request.json();
    const project = await prisma.project.create({
      data: {
        name: json.name,
        description: json.description,
        color: json.color,
        status: json.status || ProjectStatus.ACTIVE,
        // Associate the project with the current user
        userId,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    logger.error(
      "Error creating project:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
