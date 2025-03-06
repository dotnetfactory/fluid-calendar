import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "project-route";

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
    const project = await prisma.project.findUnique({
      where: {
        id,
        // Ensure the project belongs to the current user
        userId,
      },
      include: {
        tasks: true,
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    logger.error(
      "Error fetching project:",
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
    const json = await request.json();

    const project = await prisma.project.update({
      where: {
        id,
        // Ensure the project belongs to the current user
        userId,
      },
      data: {
        name: json.name,
        description: json.description,
        color: json.color,
        status: json.status,
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
      "Error updating project:",
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

    // Check if project exists and get task count
    const project = await prisma.project.findUnique({
      where: {
        id,
        // Ensure the project belongs to the current user
        userId,
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!project) {
      return new NextResponse("Project not found", { status: 404 });
    }

    // Use transaction to ensure atomic deletion
    await prisma.$transaction(async (tx) => {
      // Delete all tasks associated with the project
      await tx.task.deleteMany({
        where: {
          projectId: id,
          // Ensure we only delete tasks belonging to the current user
          userId,
        },
      });

      // Delete the project (this will cascade delete OutlookTaskListMappings due to onDelete: CASCADE)
      await tx.project.delete({
        where: {
          id,
          // Ensure the project belongs to the current user
          userId,
        },
      });
    });

    return NextResponse.json({
      success: true,
      deletedTasks: project._count.tasks,
    });
  } catch (error) {
    logger.error(
      "Error deleting project:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
