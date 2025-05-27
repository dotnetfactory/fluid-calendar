import { Project, Tag, Task } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type ExportTasksInput,
  ExportTasksInputSchema,
  type ImportTasksInput,
  ImportTasksInputSchema,
} from "./schemas";

const LOG_SOURCE = "ImportExportAPI";

// Extended task type with relations
type TaskWithRelations = Task & {
  tags: Tag[];
  project: Project | null;
};

// Export data structure
export type ExportData = {
  metadata: {
    exportDate: string;
    version: string;
    includeCompleted: boolean;
  };
  tasks: TaskWithRelations[];
  projects: Project[];
  tags: Tag[];
};

// Import result type
export type ImportResult = {
  success: boolean;
  imported: number;
};

/**
 * Export tasks with related data
 */
export async function exportTasks(
  userId: string,
  input: ExportTasksInput = { includeCompleted: false }
): Promise<ExportData> {
  const { includeCompleted } = ExportTasksInputSchema.parse(input);

  logger.info(
    "Exporting tasks for user",
    { userId, includeCompleted },
    LOG_SOURCE
  );

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
  const exportData: ExportData = {
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

  return exportData;
}

/**
 * Import tasks with related data
 */
export async function importTasks(
  userId: string,
  input: ImportTasksInput
): Promise<ImportResult> {
  const data = ImportTasksInputSchema.parse(input);

  logger.info(
    "Importing tasks for user",
    { userId, taskCount: data.tasks.length },
    LOG_SOURCE
  );

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
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          duration: task.duration,
          priority: task.priority,
          energyLevel: task.energyLevel,
          preferredTime: task.preferredTime,
          isAutoScheduled: task.isAutoScheduled || false,
          scheduleLocked: task.scheduleLocked || false,
          scheduledStart: task.scheduledStart
            ? new Date(task.scheduledStart)
            : null,
          scheduledEnd: task.scheduledEnd ? new Date(task.scheduledEnd) : null,
          scheduleScore: task.scheduleScore,
          lastScheduled: task.lastScheduled
            ? new Date(task.lastScheduled)
            : null,
          isRecurring: task.isRecurring || false,
          recurrenceRule: task.recurrenceRule,
          lastCompletedDate: task.lastCompletedDate
            ? new Date(task.lastCompletedDate)
            : null,
          completedAt: task.completedAt ? new Date(task.completedAt) : null,
          postponedUntil: task.postponedUntil
            ? new Date(task.postponedUntil)
            : null,
          externalTaskId: task.externalTaskId,
          source: task.source,
          lastSyncedAt: task.lastSyncedAt ? new Date(task.lastSyncedAt) : null,
          createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
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

  return {
    success: true,
    imported: result.importedCount,
  };
}
