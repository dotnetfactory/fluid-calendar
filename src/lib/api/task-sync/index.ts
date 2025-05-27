import {
  ConnectedAccount,
  Project,
  TaskListMapping,
  TaskProvider,
} from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type CreateTaskMappingInput,
  CreateTaskMappingInputSchema,
  type CreateTaskProviderInput,
  CreateTaskProviderInputSchema,
  type DeleteTaskMappingInput,
  DeleteTaskMappingInputSchema,
  type DeleteTaskProviderInput,
  DeleteTaskProviderInputSchema,
  type GetAllTaskMappingsInput,
  GetAllTaskMappingsInputSchema,
  type GetAllTaskProvidersInput,
  GetAllTaskProvidersInputSchema,
  type GetProviderListsInput,
  GetProviderListsInputSchema,
  type GetTaskMappingByIdInput,
  GetTaskMappingByIdInputSchema,
  type GetTaskProviderByIdInput,
  GetTaskProviderByIdInputSchema,
  type TriggerSyncInput,
  TriggerSyncInputSchema,
  type UpdateTaskMappingInput,
  UpdateTaskMappingInputSchema,
  type UpdateTaskProviderInput,
  UpdateTaskProviderInputSchema,
} from "./schemas";

const LOG_SOURCE = "TaskSyncAPI";

// Extended types with relations
type TaskProviderWithRelations = TaskProvider & {
  account?: Pick<ConnectedAccount, "id" | "provider" | "email"> | null;
  mappings?: TaskListMapping[];
  _count?: {
    mappings: number;
  };
};

type TaskMappingWithRelations = TaskListMapping & {
  provider?: Pick<TaskProvider, "id" | "name" | "type"> | null;
  project?: Pick<Project, "id" | "name" | "color"> | null;
};

/**
 * Get all task providers for a user
 */
export async function getAllTaskProviders(
  userId: string,
  input: GetAllTaskProvidersInput = {
    includeAccount: false,
    includeMappings: false,
  }
): Promise<TaskProviderWithRelations[]> {
  const validatedInput = GetAllTaskProvidersInputSchema.parse(input);
  const { includeAccount, includeMappings } = validatedInput;

  logger.info(
    "Getting all task providers for user",
    { userId, includeAccount, includeMappings },
    LOG_SOURCE
  );

  const providers = await prisma.taskProvider.findMany({
    where: {
      userId,
    },
    include: {
      ...(includeAccount && {
        account: {
          select: {
            id: true,
            provider: true,
            email: true,
          },
        },
      }),
      ...(includeMappings && { mappings: true }),
      ...(!includeMappings && {
        _count: {
          select: {
            mappings: true,
          },
        },
      }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  logger.info(
    "Retrieved task providers for user",
    { userId, providerCount: providers.length },
    LOG_SOURCE
  );

  return providers;
}

/**
 * Get a specific task provider by ID
 */
export async function getTaskProviderById(
  userId: string,
  input: GetTaskProviderByIdInput
): Promise<TaskProviderWithRelations | null> {
  const { providerId, includeAccount, includeMappings } =
    GetTaskProviderByIdInputSchema.parse(input);

  logger.info(
    "Getting task provider by ID",
    { userId, providerId, includeAccount, includeMappings },
    LOG_SOURCE
  );

  const provider = await prisma.taskProvider.findUnique({
    where: {
      id: providerId,
      userId, // Ensure the provider belongs to the current user
    },
    include: {
      ...(includeAccount && {
        account: {
          select: {
            id: true,
            provider: true,
            email: true,
          },
        },
      }),
      ...(includeMappings && { mappings: true }),
      ...(!includeMappings && {
        _count: {
          select: {
            mappings: true,
          },
        },
      }),
    },
  });

  if (!provider) {
    logger.warn("Task provider not found", { userId, providerId }, LOG_SOURCE);
    return null;
  }

  logger.info(
    "Retrieved task provider",
    { userId, providerId, providerName: provider.name || "Unknown" },
    LOG_SOURCE
  );

  return provider;
}

/**
 * Create a new task provider
 */
export async function createTaskProvider(
  userId: string,
  input: CreateTaskProviderInput
): Promise<TaskProviderWithRelations> {
  const validatedInput = CreateTaskProviderInputSchema.parse(input);

  logger.info(
    "Creating task provider",
    { userId, name: validatedInput.name, type: validatedInput.type },
    LOG_SOURCE
  );

  const provider = await prisma.taskProvider.create({
    data: {
      ...validatedInput,
      userId,
      settings: validatedInput.settings
        ? JSON.parse(JSON.stringify(validatedInput.settings))
        : undefined,
    },
    include: {
      account: {
        select: {
          id: true,
          provider: true,
          email: true,
        },
      },
      _count: {
        select: {
          mappings: true,
        },
      },
    },
  });

  logger.info(
    "Task provider created successfully",
    { userId, providerId: provider.id, name: provider.name },
    LOG_SOURCE
  );

  return provider;
}

/**
 * Update an existing task provider
 */
export async function updateTaskProvider(
  userId: string,
  providerId: string,
  input: UpdateTaskProviderInput
): Promise<TaskProviderWithRelations> {
  const validatedInput = UpdateTaskProviderInputSchema.parse(input);

  logger.info("Updating task provider", { userId, providerId }, LOG_SOURCE);

  // First, check if the provider exists and belongs to the user
  const existingProvider = await prisma.taskProvider.findUnique({
    where: {
      id: providerId,
      userId,
    },
  });

  if (!existingProvider) {
    logger.warn(
      "Task provider update failed - provider not found",
      { userId, providerId },
      LOG_SOURCE
    );
    throw new Error("Provider not found or does not belong to the user");
  }

  const updatedProvider = await prisma.taskProvider.update({
    where: {
      id: providerId,
      userId, // Ensure the provider belongs to the current user
    },
    data: {
      ...validatedInput,
      ...(validatedInput.settings && {
        settings: JSON.parse(JSON.stringify(validatedInput.settings)),
      }),
    },
    include: {
      account: {
        select: {
          id: true,
          provider: true,
          email: true,
        },
      },
      _count: {
        select: {
          mappings: true,
        },
      },
    },
  });

  logger.info(
    "Task provider updated successfully",
    { userId, providerId, name: updatedProvider.name },
    LOG_SOURCE
  );

  return updatedProvider;
}

/**
 * Delete a task provider
 */
export async function deleteTaskProvider(
  userId: string,
  input: DeleteTaskProviderInput
): Promise<{ success: boolean }> {
  const { providerId } = DeleteTaskProviderInputSchema.parse(input);

  logger.info("Deleting task provider", { userId, providerId }, LOG_SOURCE);

  // First, check if the provider exists and belongs to the user
  const existingProvider = await prisma.taskProvider.findUnique({
    where: {
      id: providerId,
      userId,
    },
  });

  if (!existingProvider) {
    logger.warn(
      "Task provider deletion failed - provider not found",
      { userId, providerId },
      LOG_SOURCE
    );
    throw new Error("Provider not found or does not belong to the user");
  }

  // Delete the provider (mappings will be deleted due to cascade)
  await prisma.taskProvider.delete({
    where: {
      id: providerId,
      userId, // Ensure the provider belongs to the current user
    },
  });

  logger.info(
    "Task provider deleted successfully",
    { userId, providerId, providerName: existingProvider.name },
    LOG_SOURCE
  );

  return { success: true };
}

/**
 * Get all task mappings for a user
 */
export async function getAllTaskMappings(
  userId: string,
  input: GetAllTaskMappingsInput = {
    includeProvider: true,
    includeProject: true,
  }
): Promise<TaskMappingWithRelations[]> {
  const validatedInput = GetAllTaskMappingsInputSchema.parse(input);
  const { providerId, includeProvider, includeProject } = validatedInput;

  logger.info(
    "Getting all task mappings for user",
    { userId, providerId: providerId || null, includeProvider, includeProject },
    LOG_SOURCE
  );

  const mappings = await prisma.taskListMapping.findMany({
    where: {
      provider: {
        userId,
        ...(providerId && { id: providerId }),
      },
    },
    include: {
      ...(includeProvider && {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      }),
      ...(includeProject && {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  logger.info(
    "Retrieved task mappings for user",
    { userId, mappingCount: mappings.length },
    LOG_SOURCE
  );

  return mappings;
}

/**
 * Get a specific task mapping by ID
 */
export async function getTaskMappingById(
  userId: string,
  input: GetTaskMappingByIdInput
): Promise<TaskMappingWithRelations | null> {
  const { mappingId, includeProvider, includeProject } =
    GetTaskMappingByIdInputSchema.parse(input);

  logger.info(
    "Getting task mapping by ID",
    { userId, mappingId, includeProvider, includeProject },
    LOG_SOURCE
  );

  const mapping = await prisma.taskListMapping.findFirst({
    where: {
      id: mappingId,
      provider: {
        userId, // Ensure the mapping belongs to a provider owned by the current user
      },
    },
    include: {
      ...(includeProvider && {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      }),
      ...(includeProject && {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      }),
    },
  });

  if (!mapping) {
    logger.warn("Task mapping not found", { userId, mappingId }, LOG_SOURCE);
    return null;
  }

  logger.info(
    "Retrieved task mapping",
    { userId, mappingId, externalListName: mapping.externalListName },
    LOG_SOURCE
  );

  return mapping;
}

/**
 * Create a new task mapping
 */
export async function createTaskMapping(
  userId: string,
  input: CreateTaskMappingInput
): Promise<TaskMappingWithRelations> {
  const validatedInput = CreateTaskMappingInputSchema.parse(input);

  logger.info(
    "Creating task mapping",
    {
      userId,
      providerId: validatedInput.providerId,
      externalListName: validatedInput.externalListName,
    },
    LOG_SOURCE
  );

  // Verify the provider exists and belongs to the user
  const provider = await prisma.taskProvider.findUnique({
    where: {
      id: validatedInput.providerId,
      userId,
    },
  });

  if (!provider) {
    logger.warn(
      "Task mapping creation failed - provider not found",
      { userId, providerId: validatedInput.providerId },
      LOG_SOURCE
    );
    throw new Error("Provider not found or does not belong to the user");
  }

  // Verify the project exists and belongs to the user
  const project = await prisma.project.findUnique({
    where: {
      id: validatedInput.projectId,
      userId,
    },
  });

  if (!project) {
    logger.warn(
      "Task mapping creation failed - project not found",
      { userId, projectId: validatedInput.projectId },
      LOG_SOURCE
    );
    throw new Error("Project not found or does not belong to the user");
  }

  // Check if a mapping already exists for this external list
  const existingMapping = await prisma.taskListMapping.findFirst({
    where: {
      providerId: validatedInput.providerId,
      externalListId: validatedInput.externalListId,
    },
  });

  if (existingMapping) {
    logger.warn(
      "Task mapping creation failed - mapping already exists",
      {
        userId,
        providerId: validatedInput.providerId,
        externalListId: validatedInput.externalListId,
      },
      LOG_SOURCE
    );
    throw new Error("A mapping already exists for this external list");
  }

  const mapping = await prisma.taskListMapping.create({
    data: validatedInput,
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  logger.info(
    "Task mapping created successfully",
    {
      userId,
      mappingId: mapping.id,
      externalListName: mapping.externalListName,
    },
    LOG_SOURCE
  );

  return mapping;
}

/**
 * Update an existing task mapping
 */
export async function updateTaskMapping(
  userId: string,
  mappingId: string,
  input: UpdateTaskMappingInput
): Promise<TaskMappingWithRelations> {
  const validatedInput = UpdateTaskMappingInputSchema.parse(input);

  logger.info("Updating task mapping", { userId, mappingId }, LOG_SOURCE);

  // First, check if the mapping exists and belongs to the user
  const existingMapping = await prisma.taskListMapping.findFirst({
    where: {
      id: mappingId,
      provider: {
        userId,
      },
    },
  });

  if (!existingMapping) {
    logger.warn(
      "Task mapping update failed - mapping not found",
      { userId, mappingId },
      LOG_SOURCE
    );
    throw new Error("Mapping not found or does not belong to the user");
  }

  // If updating projectId, verify the project exists and belongs to the user
  if (validatedInput.projectId) {
    const project = await prisma.project.findUnique({
      where: {
        id: validatedInput.projectId,
        userId,
      },
    });

    if (!project) {
      logger.warn(
        "Task mapping update failed - project not found",
        { userId, projectId: validatedInput.projectId },
        LOG_SOURCE
      );
      throw new Error("Project not found or does not belong to the user");
    }
  }

  const updatedMapping = await prisma.taskListMapping.update({
    where: {
      id: mappingId,
    },
    data: validatedInput,
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  logger.info(
    "Task mapping updated successfully",
    { userId, mappingId, externalListName: updatedMapping.externalListName },
    LOG_SOURCE
  );

  return updatedMapping;
}

/**
 * Delete a task mapping
 */
export async function deleteTaskMapping(
  userId: string,
  input: DeleteTaskMappingInput
): Promise<{ success: boolean }> {
  const { mappingId } = DeleteTaskMappingInputSchema.parse(input);

  logger.info("Deleting task mapping", { userId, mappingId }, LOG_SOURCE);

  // First, check if the mapping exists and belongs to the user
  const existingMapping = await prisma.taskListMapping.findFirst({
    where: {
      id: mappingId,
      provider: {
        userId,
      },
    },
  });

  if (!existingMapping) {
    logger.warn(
      "Task mapping deletion failed - mapping not found",
      { userId, mappingId },
      LOG_SOURCE
    );
    throw new Error("Mapping not found or does not belong to the user");
  }

  await prisma.taskListMapping.delete({
    where: {
      id: mappingId,
    },
  });

  logger.info(
    "Task mapping deleted successfully",
    { userId, mappingId, externalListName: existingMapping.externalListName },
    LOG_SOURCE
  );

  return { success: true };
}

/**
 * Get provider lists (placeholder - actual implementation would depend on provider type)
 */
export async function getProviderLists(
  userId: string,
  input: GetProviderListsInput
): Promise<{ lists: Array<{ id: string; name: string }> }> {
  const { providerId } = GetProviderListsInputSchema.parse(input);

  logger.info("Getting provider lists", { userId, providerId }, LOG_SOURCE);

  // First, verify the provider exists and belongs to the user
  const provider = await prisma.taskProvider.findUnique({
    where: {
      id: providerId,
      userId,
    },
  });

  if (!provider) {
    logger.warn(
      "Get provider lists failed - provider not found",
      { userId, providerId },
      LOG_SOURCE
    );
    throw new Error("Provider not found or does not belong to the user");
  }

  // TODO: Implement actual provider-specific list fetching
  // This would involve calling the appropriate provider API (Outlook, Google, etc.)
  logger.info("Provider lists retrieved", { userId, providerId }, LOG_SOURCE);

  return {
    lists: [], // Placeholder - actual implementation would fetch from provider API
  };
}

/**
 * Trigger sync (placeholder - actual implementation would be complex)
 */
export async function triggerSync(
  userId: string,
  input: TriggerSyncInput = { forceSync: false }
): Promise<{ success: boolean; message: string }> {
  const { providerId, mappingId, forceSync } =
    TriggerSyncInputSchema.parse(input);

  logger.info(
    "Triggering sync",
    {
      userId,
      providerId: providerId || null,
      mappingId: mappingId || null,
      forceSync,
    },
    LOG_SOURCE
  );

  // TODO: Implement actual sync logic
  // This would involve:
  // - Fetching tasks from external providers
  // - Comparing with local tasks
  // - Resolving conflicts
  // - Updating both local and external tasks

  logger.info(
    "Sync triggered",
    { userId, providerId: providerId || null, mappingId: mappingId || null },
    LOG_SOURCE
  );

  return {
    success: true,
    message:
      "Sync functionality will be implemented in the business logic layer",
  };
}
