import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RRule } from "rrule";
import { TaskStatus } from "@/types/task";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: {
        id,
      },
      include: {
        tags: true,
        project: true,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: {
        id,
      },
      include: {
        tags: true,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    const json = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tagIds, project, projectId, ...updates } = json;

    // Handle recurring task completion
    if (
      task.isRecurring &&
      updates.status === TaskStatus.COMPLETED &&
      task.recurrenceRule
    ) {
      try {
        const rrule = RRule.fromString(task.recurrenceRule);

        // For tasks, we only care about the date part
        const baseDate = new Date(task.dueDate || new Date());
        // Set to start of day in UTC
        baseDate.setUTCHours(0, 0, 0, 0);

        // Add one day to the base date to ensure we get the next occurrence
        const searchDate = new Date(baseDate);
        searchDate.setDate(searchDate.getDate() + 1);

        // Get next occurrence and ensure it's just a date
        const nextOccurrence = rrule.after(searchDate);
        if (nextOccurrence) {
          nextOccurrence.setUTCHours(0, 0, 0, 0);
        }

        console.log("baseDate", baseDate.toISOString());
        console.log("searchDate", searchDate.toISOString());
        console.log("nextOccurrence", nextOccurrence?.toISOString());

        if (nextOccurrence) {
          // Create a completed instance as a separate task
          await prisma.task.create({
            data: {
              title: task.title,
              description: task.description,
              status: TaskStatus.COMPLETED,
              dueDate: baseDate, // Use the original due date for the completed instance
              duration: task.duration,
              priority: task.priority,
              energyLevel: task.energyLevel,
              preferredTime: task.preferredTime,
              projectId: task.projectId,
              isRecurring: false,
              tags: {
                connect: task.tags.map((tag) => ({ id: tag.id })),
              },
            },
          });

          // Update the recurring task with new due date and reset status
          updates.dueDate = nextOccurrence;
          updates.status = TaskStatus.TODO;
          updates.lastCompletedDate = new Date();
        }
      } catch (error) {
        console.error("Error handling task completion:", error);
        return new NextResponse("Error handling task completion", {
          status: 500,
        });
      }
    }

    const updatedTask = await prisma.task.update({
      where: {
        id: id,
      },
      data: {
        ...updates,
        ...(tagIds && {
          tags: {
            set: [], // First disconnect all tags
            connect: tagIds.map((id: string) => ({ id })), // Then connect new ones
          },
        }),
        project:
          projectId === null
            ? { disconnect: true }
            : projectId
            ? { connect: { id: projectId } }
            : undefined,
      },
      include: {
        tags: true,
        project: true,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: {
        id,
      },
    });

    if (!task) {
      return new NextResponse("Task not found", { status: 404 });
    }

    await prisma.task.delete({
      where: {
        id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting task:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
