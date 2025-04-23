import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { Project } from "@/types/project";
import { Tag, Task } from "@/types/task";

const LOG_SOURCE = "import-tasks-api";

// Define types for import data
type ImportTag = Omit<Tag, "tasks">;
type ImportProject = Omit<Project, "tasks">;
type ImportTask = Omit<Task, "tags" | "project"> & {
  tags?: { id: string; name: string; color?: string | null }[];
  externalTaskId?: string | null;
  source?: string | null;
  lastSyncedAt?: Date | null;
};

interface ImportData {
  metadata?: {
    exportDate: string;
    version: string;
    includeCompleted: boolean;
  };
  tasks: ImportTask[];
  tags?: ImportTag[];
  projects?: ImportProject[];
}

// Helper function to validate the import data structure
function validateImportData(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const importData = data as ImportData;
  if (!Array.isArray(importData.tasks)) return false;

  // Basic validation of tasks
  for (const task of importData.tasks) {
    if (!task.title || typeof task.title !== "string") return false;
    if (!task.status || typeof task.status !== "string") return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;
    const data = (await request.json()) as ImportData;

    // Validate the import data
    if (!validateImportData(data)) {
      logger.warn("Invalid import data format", { userId }, LOG_SOURCE);
      return NextResponse.json(
        { error: "Invalid import data format" },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Import tags first (if any)
      const tagMap = new Map<string, string>(); // Map old tag IDs to new tag IDs

      if (Array.isArray(data.tags)) {
        for (const tag of data.tags) {
          // Check if a tag with the same name already exists for this user
          const existingTag = await tx.tag.findFirst({
            where: {
              userId,
              name: tag.name,
            },
          });

          if (existingTag) {
            // Use the existing tag
            tagMap.set(tag.id, existingTag.id);
          } else {
            // Create a new tag
            const newTag = await tx.tag.create({
              data: {
                name: tag.name,
                color: tag.color,
                userId,
              },
            });
            tagMap.set(tag.id, newTag.id);
          }
        }
      }

      // Import projects (if any)
      const projectMap = new Map<string, string>(); // Map old project IDs to new project IDs

      if (Array.isArray(data.projects)) {
        for (const project of data.projects) {
          // Check if a project with the same name already exists for this user
          const existingProject = await tx.project.findFirst({
            where: {
              userId,
              name: project.name,
            },
          });

          if (existingProject) {
            // Use the existing project
            projectMap.set(project.id, existingProject.id);
          } else {
            // Create a new project
            const newProject = await tx.project.create({
              data: {
                name: project.name,
                description: project.description,
                color: project.color,
                status: project.status || "active",
                userId,
              },
            });
            projectMap.set(project.id, newProject.id);
          }
        }
      }

      // Import tasks
      let importedCount = 0;

      for (const task of data.tasks) {
        try {
          // Map the tag IDs
          const tagIds =
            (task.tags
              ?.map((tag) => tagMap.get(tag.id) || null)
              .filter(Boolean) as string[]) || [];

          // Map the project ID
          const projectId = task.projectId
            ? projectMap.get(task.projectId) || null
            : null;

          // Create the task with proper type handling
          const taskData = {
            title: task.title,
            description: task.description,
            status: task.status,
            dueDate: task.dueDate,
            duration: task.duration,
            priority: task.priority,
            energyLevel: task.energyLevel,
            preferredTime: task.preferredTime,
            isAutoScheduled: task.isAutoScheduled || false,
            scheduleLocked: task.scheduleLocked || false,
            scheduledStart: task.scheduledStart,
            scheduledEnd: task.scheduledEnd,
            scheduleScore: task.scheduleScore,
            lastScheduled: task.lastScheduled,
            isRecurring: task.isRecurring || false,
            recurrenceRule: task.recurrenceRule,
            lastCompletedDate: task.lastCompletedDate,
            completedAt: task.completedAt,
            postponedUntil: task.postponedUntil,
            externalTaskId: task.externalTaskId,
            source: task.source,
            lastSyncedAt: task.lastSyncedAt,
            createdAt: new Date(task.createdAt as Date) || new Date(),
            updatedAt: new Date(),
          };

          // Add project connection if needed
          if (projectId) {
            await tx.task.create({
              data: {
                ...taskData,
                user: { connect: { id: userId } },
                project: { connect: { id: projectId } },
                ...(tagIds.length > 0
                  ? {
                      tags: { connect: tagIds.map((id) => ({ id })) },
                    }
                  : {}),
              },
            });
          } else {
            // Create without project connection
            await tx.task.create({
              data: {
                ...taskData,
                user: { connect: { id: userId } },
                ...(tagIds.length > 0
                  ? {
                      tags: { connect: tagIds.map((id) => ({ id })) },
                    }
                  : {}),
              },
            });
          }

          importedCount++;
        } catch (taskError) {
          logger.warn(
            "Error importing individual task",
            {
              error:
                taskError instanceof Error
                  ? taskError.message
                  : String(taskError),
              taskTitle: task.title,
            },
            LOG_SOURCE
          );
          // Continue with the next task
        }
      }

      return { importedCount };
    });

    logger.info(
      "Tasks imported successfully",
      {
        userId,
        importedCount: result.importedCount,
      },
      LOG_SOURCE
    );

    return NextResponse.json({
      success: true,
      imported: result.importedCount,
    });
  } catch (error) {
    logger.error(
      "Error importing tasks",
      {
        error: error instanceof Error ? error.message : String(error),
      },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to import tasks" },
      { status: 500 }
    );
  }
}
