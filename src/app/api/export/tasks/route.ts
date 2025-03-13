import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "export-tasks-api";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    // Get the includeCompleted parameter from the query string
    const includeCompleted =
      request.nextUrl.searchParams.get("includeCompleted") === "true";

    // Fetch all tasks for the user
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        // Filter out completed tasks if includeCompleted is false
        ...(includeCompleted ? {} : { status: { not: "completed" } }),
      },
      include: {
        tags: true,
        project: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Fetch all projects for the user
    const projects = await prisma.project.findMany({
      where: {
        userId,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Fetch all tags for the user
    const tags = await prisma.tag.findMany({
      where: {
        userId,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Create the export data structure
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: "1.0",
        includeCompleted,
      },
      tasks,
      projects,
      tags,
    };

    logger.info(
      "Tasks exported",
      {
        userId,
        taskCount: tasks.length,
        projectCount: projects.length,
        tagCount: tags.length,
        includeCompleted,
      },
      LOG_SOURCE
    );

    return NextResponse.json(exportData);
  } catch (error) {
    logger.error(
      "Error exporting tasks",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to export tasks" },
      { status: 500 }
    );
  }
}
