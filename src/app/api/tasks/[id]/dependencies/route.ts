import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "TaskDependenciesAPI";

/**
 * GET /api/tasks/[id]/dependencies — Get dependencies for a task
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const { id } = await params;

  // Get tasks this task depends on (prerequisites)
  const dependencies = await prisma.taskDependency.findMany({
    where: { dependentTaskId: id },
    include: {
      prerequisite: {
        select: { id: true, title: true, status: true, externalTaskId: true },
      },
    },
  });

  // Get tasks that depend on this task
  const dependents = await prisma.taskDependency.findMany({
    where: { prerequisiteId: id },
    include: {
      dependentTask: {
        select: { id: true, title: true, status: true, externalTaskId: true },
      },
    },
  });

  return NextResponse.json({
    blockedBy: dependencies.map((d) => ({
      id: d.id,
      type: d.type,
      source: d.source,
      task: d.prerequisite,
    })),
    blocks: dependents.map((d) => ({
      id: d.id,
      type: d.type,
      source: d.source,
      task: d.dependentTask,
    })),
  });
}

/**
 * POST /api/tasks/[id]/dependencies — Add a dependency
 * Body: { prerequisiteId, type?, source? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const { id } = await params;
    const { prerequisiteId, type, source } = await request.json();

    if (!prerequisiteId) {
      return NextResponse.json(
        { error: "prerequisiteId is required" },
        { status: 400 }
      );
    }

    if (prerequisiteId === id) {
      return NextResponse.json(
        { error: "A task cannot depend on itself" },
        { status: 400 }
      );
    }

    // Verify both tasks exist and belong to user
    const [task, prereq] = await Promise.all([
      prisma.task.findFirst({ where: { id, userId: auth.userId } }),
      prisma.task.findFirst({ where: { id: prerequisiteId, userId: auth.userId } }),
    ]);

    if (!task || !prereq) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const dependency = await prisma.taskDependency.upsert({
      where: {
        dependentTaskId_prerequisiteId: {
          dependentTaskId: id,
          prerequisiteId,
        },
      },
      create: {
        dependentTaskId: id,
        prerequisiteId,
        type: type || "finish_to_start",
        source: source || "manual",
      },
      update: {
        type: type || "finish_to_start",
        source: source || "manual",
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    console.error("Dependency POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]/dependencies — Remove a dependency
 * Query: ?prerequisiteId=xxx
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const prerequisiteId = searchParams.get("prerequisiteId");

  if (!prerequisiteId) {
    return NextResponse.json(
      { error: "prerequisiteId is required" },
      { status: 400 }
    );
  }

  await prisma.taskDependency.deleteMany({
    where: { dependentTaskId: id, prerequisiteId },
  });

  return NextResponse.json({ success: true });
}
