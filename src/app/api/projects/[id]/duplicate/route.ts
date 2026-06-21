import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { buildDuplicatedTaskData } from "@/lib/projects/duplicate";

import { ProjectStatus } from "@/types/project";
import { TaskStatus } from "@/types/task";

const LOG_SOURCE = "project-duplicate-route";

export async function POST(
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

    // Optional new name from the request body; fall back below.
    let requestedName: string | undefined;
    try {
      const json = await request.json();
      if (typeof json?.name === "string") {
        requestedName = json.name.trim();
      }
    } catch {
      // No / empty body is fine - we will default the name.
    }

    // Load the source project (scoped to the owner) with its tasks and tags.
    const source = await prisma.project.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        tasks: {
          include: {
            tags: { select: { id: true } },
          },
        },
      },
    });

    if (!source) {
      return new NextResponse("Project not found", { status: 404 });
    }

    const newName =
      requestedName && requestedName.length > 0
        ? requestedName
        : `Copy of ${source.name}`;

    // Only incomplete tasks are copied.
    const tasksToCopy = source.tasks.filter(
      (task) => task.status !== TaskStatus.COMPLETED
    );

    // Create the new project and all duplicated tasks atomically.
    const newProject = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: newName,
          description: source.description,
          color: source.color,
          status: ProjectStatus.ACTIVE,
          userId,
        },
      });

      for (const task of tasksToCopy) {
        await tx.task.create({
          data: buildDuplicatedTaskData(task, project.id, userId),
        });
      }

      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: {
          _count: {
            select: { tasks: true },
          },
        },
      });
    });

    return NextResponse.json(newProject);
  } catch (error) {
    logger.error(
      "Error duplicating project:",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
