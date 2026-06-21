import { NextRequest } from "next/server";

import { v1Read, v1Write, ApiHttpError } from "@/lib/api/v1";
import { prisma } from "@/lib/prisma";
import { deleteTaskBlockEvent, schedulePushTaskBlock } from "@/lib/task-block-push";
import { normalizeRecurrenceRule } from "@/lib/utils/normalize-recurrence-rules";

/**
 * GET /api/v1/tasks/[id] — Retrieve a single task.
 *
 * Returns NOT_FOUND if the task doesn't exist or doesn't belong to the user.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return v1Read(request, async ({ userId }) => {
    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        tags: true,
        project: true,
      },
    });

    if (!task) {
      throw new ApiHttpError("NOT_FOUND", `Task with id ${id} not found`);
    }

    return {
      status: 200,
      body: task,
    };
  });
}

/**
 * PATCH /api/v1/tasks/[id] — Update a task (partial fields only).
 *
 * Returns NOT_FOUND if the task doesn't exist or doesn't belong to the user.
 * Only provided fields are updated.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return v1Write(request, "PATCH /api/v1/tasks/[id]", async ({ userId }) => {
    const { id } = await params;

    // Verify task exists and belongs to user
    const existing = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      throw new ApiHttpError("NOT_FOUND", `Task with id ${id} not found`);
    }

    const json = await request.json();
    const {
      tagIds,
      projectId,
      recurrenceRule,
      ...updates
    } = json;

    // Never allow these to be set via PATCH
    delete updates.userId;
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Normalize recurrence rule if provided
    if (recurrenceRule !== undefined) {
      updates.recurrenceRule = recurrenceRule
        ? normalizeRecurrenceRule(recurrenceRule)
        : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...updates,
        ...(tagIds !== undefined && {
          tags: {
            set: [],
            connect: tagIds.map((tagId: string) => ({ id: tagId })),
          },
        }),
        ...(projectId !== undefined && {
          projectId: projectId === null ? undefined : projectId,
        }),
      },
      include: {
        tags: true,
        project: true,
      },
    });

    // Schedule calendar block push for any changes to scheduled times
    schedulePushTaskBlock(userId, id);

    return {
      status: 200,
      body: updatedTask,
    };
  });
}

/**
 * DELETE /api/v1/tasks/[id] — Delete a task.
 *
 * Returns NOT_FOUND if the task doesn't exist or doesn't belong to the user.
 * Returns 200 with { deleted: true, id }.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return v1Write(request, "DELETE /api/v1/tasks/[id]", async ({ userId }) => {
    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        project: true,
      },
    });

    if (!task) {
      throw new ApiHttpError("NOT_FOUND", `Task with id ${id} not found`);
    }

    // Delete calendar event if it exists
    if (task.blockEventId && task.blockFeedId) {
      await deleteTaskBlockEvent(userId, task.blockEventId, task.blockFeedId);
    }

    // Delete the task
    await prisma.task.delete({
      where: { id },
    });

    return {
      status: 200,
      body: { deleted: true, id },
    };
  });
}
