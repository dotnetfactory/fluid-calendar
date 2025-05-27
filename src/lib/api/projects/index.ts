import { Project } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type CreateProjectInput,
  CreateProjectInputSchema,
  type GetAllProjectsInput,
  GetAllProjectsInputSchema,
  type GetProjectByIdInput,
  GetProjectByIdInputSchema,
  type UpdateProjectInput,
  UpdateProjectInputSchema,
} from "./schemas";

const LOG_SOURCE = "ProjectAPI";

// Extended project type with task count
type ProjectWithCount = Project & {
  _count: {
    tasks: number;
  };
  tasks?: unknown[];
};

/**
 * Get all projects for a user
 */
export async function getAllProjects(
  userId: string,
  input: GetAllProjectsInput = {}
): Promise<ProjectWithCount[]> {
  const validatedInput = GetAllProjectsInputSchema.parse(input);
  const { status, search } = validatedInput;

  logger.info(
    "Getting all projects for user",
    { userId, status: status || null, search: search || null },
    LOG_SOURCE
  );

  const projects = await prisma.project.findMany({
    where: {
      userId,
      ...(status && status.length > 0 && { status: { in: status } }),
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

  logger.info(
    "Retrieved projects for user",
    { userId, projectCount: projects.length },
    LOG_SOURCE
  );

  return projects;
}

/**
 * Get a specific project by ID
 */
export async function getProjectById(
  userId: string,
  input: GetProjectByIdInput
): Promise<ProjectWithCount | null> {
  const { projectId, includeTasks } = GetProjectByIdInputSchema.parse(input);

  logger.info(
    "Getting project by ID",
    { userId, projectId, includeTasks },
    LOG_SOURCE
  );

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId, // Ensure the project belongs to the current user
    },
    include: {
      _count: {
        select: { tasks: true },
      },
      ...(includeTasks && { tasks: true }),
    },
  });

  if (!project) {
    logger.warn("Project not found", { userId, projectId }, LOG_SOURCE);
    return null;
  }

  logger.info(
    "Retrieved project",
    { userId, projectId, projectName: project.name },
    LOG_SOURCE
  );

  return project;
}

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  input: CreateProjectInput
): Promise<ProjectWithCount> {
  const validatedInput = CreateProjectInputSchema.parse(input);
  const { name, description, color, status } = validatedInput;

  logger.info(
    "Creating project",
    {
      userId,
      name,
      description: description || null,
      color: color || null,
      status,
    },
    LOG_SOURCE
  );

  const project = await prisma.project.create({
    data: {
      name,
      description,
      color,
      status,
      userId,
    },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  logger.info(
    "Project created successfully",
    { userId, projectId: project.id, name: project.name },
    LOG_SOURCE
  );

  return project;
}

/**
 * Update an existing project
 */
export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput
): Promise<ProjectWithCount> {
  const validatedInput = UpdateProjectInputSchema.parse(input);
  const { name, description, color, status } = validatedInput;

  logger.info(
    "Updating project",
    {
      userId,
      projectId,
      name: name || null,
      description: description || null,
      color: color || null,
      status: status || null,
    },
    LOG_SOURCE
  );

  // First, check if the project exists and belongs to the user
  const existingProject = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId,
    },
  });

  if (!existingProject) {
    logger.warn(
      "Project update failed - project not found",
      { userId, projectId },
      LOG_SOURCE
    );
    throw new Error("Project not found");
  }

  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
      userId,
    },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(status && { status }),
    },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  logger.info(
    "Project updated successfully",
    { userId, projectId, name: updatedProject.name },
    LOG_SOURCE
  );

  return updatedProject;
}

/**
 * Delete a project and all its tasks
 */
export async function deleteProject(
  userId: string,
  projectId: string
): Promise<{ success: boolean; deletedTasks: number }> {
  logger.info("Deleting project", { userId, projectId }, LOG_SOURCE);

  // First, check if the project exists and belongs to the user
  const existingProject = await prisma.project.findUnique({
    where: {
      id: projectId,
      userId,
    },
    include: {
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (!existingProject) {
    logger.warn(
      "Project deletion failed - project not found",
      { userId, projectId },
      LOG_SOURCE
    );
    throw new Error("Project not found");
  }

  const deletedTasksCount = existingProject._count.tasks;

  // Use transaction to ensure atomic deletion
  await prisma.$transaction(async (tx) => {
    // Delete all tasks associated with the project
    await tx.task.deleteMany({
      where: {
        projectId,
        userId, // Ensure we only delete tasks belonging to the current user
      },
    });

    // Delete the project (this will cascade delete TaskListMappings due to onDelete: CASCADE)
    await tx.project.delete({
      where: {
        id: projectId,
        userId,
      },
    });
  });

  logger.info(
    "Project deleted successfully",
    {
      userId,
      projectId,
      projectName: existingProject.name,
      deletedTasks: deletedTasksCount,
    },
    LOG_SOURCE
  );

  return { success: true, deletedTasks: deletedTasksCount };
}
