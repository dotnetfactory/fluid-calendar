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

    // Optional new name from the request body. An empty body is valid (the
    // name defaults below). A non-empty body, however, MUST be a JSON object
    // with an optional string `name`; anything else (malformed JSON, a JSON
    // primitive/array/null, or a non-string `name`) is a bad request and is
    // rejected with 400 rather than silently performing this state-changing
    // duplicate under the default name.
    let requestedName: string | undefined;
    const rawBody = (await request.text()).trim();
    if (rawBody.length > 0) {
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        return new NextResponse("Invalid JSON body", { status: 400 });
      }
      if (typeof json !== "object" || json === null || Array.isArray(json)) {
        return new NextResponse("Invalid request body", { status: 400 });
      }
      const name = (json as { name?: unknown }).name;
      if (name !== undefined) {
        if (typeof name !== "string") {
          return new NextResponse("Invalid project name", { status: 400 });
        }
        requestedName = name.trim();
      }
    }

    // Load the source project (scoped to the owner) with its incomplete tasks
    // and their tags. The task relation is filtered by `userId` as well as the
    // project owner: the schema does not guarantee that a task's owner matches
    // its project's owner, so this prevents another user's task that is somehow
    // attached to this project from being copied into the requester's account.
    const source = await prisma.project.findUnique({
      where: {
        id,
        userId,
      },
      include: {
        tasks: {
          where: {
            userId,
            status: { not: TaskStatus.COMPLETED },
          },
          include: {
            // Only the requester's own tags are carried over. Tags are
            // tenant-scoped and the schema does not enforce that a task's tags
            // share its owner, so filtering here prevents a foreign user's tag
            // from being reconnected to the duplicated task.
            tags: { where: { userId }, select: { id: true } },
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

    // The query already restricts to the owner's incomplete tasks.
    const tasksToCopy = source.tasks;

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
