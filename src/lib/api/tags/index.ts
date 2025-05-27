import { Tag } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import {
  type CreateTagInput,
  CreateTagInputSchema,
  type GetAllTagsInput,
  GetAllTagsInputSchema,
  type GetTagByIdInput,
  GetTagByIdInputSchema,
  type UpdateTagInput,
  UpdateTagInputSchema,
} from "./schemas";

const LOG_SOURCE = "TagAPI";

/**
 * Get all tags for a user
 */
export async function getAllTags(
  userId: string,
  input: GetAllTagsInput = {}
): Promise<Tag[]> {
  GetAllTagsInputSchema.parse(input);

  logger.info("Getting all tags for user", { userId }, LOG_SOURCE);

  const tags = await prisma.tag.findMany({
    where: {
      userId,
    },
    orderBy: {
      name: "asc",
    },
  });

  logger.info(
    "Retrieved tags for user",
    { userId, tagCount: tags.length },
    LOG_SOURCE
  );

  return tags;
}

/**
 * Get a specific tag by ID
 */
export async function getTagById(
  userId: string,
  input: GetTagByIdInput
): Promise<Tag | null> {
  const { tagId } = GetTagByIdInputSchema.parse(input);

  logger.info("Getting tag by ID", { userId, tagId }, LOG_SOURCE);

  const tag = await prisma.tag.findUnique({
    where: {
      id: tagId,
      userId, // Ensure the tag belongs to the current user
    },
  });

  if (!tag) {
    logger.warn("Tag not found", { userId, tagId }, LOG_SOURCE);
    return null;
  }

  logger.info(
    "Retrieved tag",
    { userId, tagId, tagName: tag.name },
    LOG_SOURCE
  );

  return tag;
}

/**
 * Create a new tag
 */
export async function createTag(
  userId: string,
  input: CreateTagInput
): Promise<Tag> {
  const validatedInput = CreateTagInputSchema.parse(input);
  const { name, color } = validatedInput;

  logger.info(
    "Creating tag",
    { userId, name, color: color || null },
    LOG_SOURCE
  );

  // Check if tag with same name already exists for this user
  const existingTag = await prisma.tag.findFirst({
    where: {
      name,
      userId,
    },
  });

  if (existingTag) {
    logger.warn(
      "Tag creation failed - name already exists",
      { userId, name },
      LOG_SOURCE
    );
    throw new Error("Tag with this name already exists");
  }

  const tag = await prisma.tag.create({
    data: {
      name,
      color,
      userId,
    },
  });

  logger.info(
    "Tag created successfully",
    { userId, tagId: tag.id, name: tag.name },
    LOG_SOURCE
  );

  return tag;
}

/**
 * Update an existing tag
 */
export async function updateTag(
  userId: string,
  tagId: string,
  input: UpdateTagInput
): Promise<Tag> {
  const validatedInput = UpdateTagInputSchema.parse(input);
  const { name, color } = validatedInput;

  logger.info(
    "Updating tag",
    { userId, tagId, name: name || null, color: color || null },
    LOG_SOURCE
  );

  // First, check if the tag exists and belongs to the user
  const existingTag = await prisma.tag.findUnique({
    where: {
      id: tagId,
      userId,
    },
  });

  if (!existingTag) {
    logger.warn(
      "Tag update failed - tag not found",
      { userId, tagId },
      LOG_SOURCE
    );
    throw new Error("Tag not found");
  }

  // Check if another tag with the same name exists for this user
  if (name && name !== existingTag.name) {
    const duplicateTag = await prisma.tag.findFirst({
      where: {
        name,
        id: { not: tagId }, // Exclude current tag
        userId,
      },
    });

    if (duplicateTag) {
      logger.warn(
        "Tag update failed - name already exists",
        { userId, tagId, name },
        LOG_SOURCE
      );
      throw new Error("Tag with this name already exists");
    }
  }

  const updatedTag = await prisma.tag.update({
    where: {
      id: tagId,
      userId,
    },
    data: {
      ...(name && { name }),
      ...(color !== undefined && { color }),
    },
  });

  logger.info(
    "Tag updated successfully",
    { userId, tagId, name: updatedTag.name },
    LOG_SOURCE
  );

  return updatedTag;
}

/**
 * Delete a tag
 */
export async function deleteTag(userId: string, tagId: string): Promise<void> {
  logger.info("Deleting tag", { userId, tagId }, LOG_SOURCE);

  // First, check if the tag exists and belongs to the user
  const existingTag = await prisma.tag.findUnique({
    where: {
      id: tagId,
      userId,
    },
  });

  if (!existingTag) {
    logger.warn(
      "Tag deletion failed - tag not found",
      { userId, tagId },
      LOG_SOURCE
    );
    throw new Error("Tag not found");
  }

  await prisma.tag.delete({
    where: {
      id: tagId,
      userId,
    },
  });

  logger.info(
    "Tag deleted successfully",
    { userId, tagId, tagName: existingTag.name },
    LOG_SOURCE
  );
}
