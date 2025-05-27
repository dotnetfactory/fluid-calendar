import { ConnectedAccount } from "@prisma/client";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { type DeleteAccountInput, DeleteAccountInputSchema } from "./schemas";

const LOG_SOURCE = "AccountsAPI";

// Extended account type with relations
type AccountWithRelations = ConnectedAccount & {
  calendars: {
    id: string;
    name: string;
  }[];
};

/**
 * Get all connected accounts for a user
 */
export async function getAllAccounts(
  userId: string
): Promise<AccountWithRelations[]> {
  logger.info("Getting all accounts for user", { userId }, LOG_SOURCE);

  const accounts = await prisma.connectedAccount.findMany({
    where: {
      userId,
    },
    include: {
      calendars: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  logger.info(
    "Retrieved accounts for user",
    { userId, accountCount: accounts.length },
    LOG_SOURCE
  );

  return accounts;
}

/**
 * Delete a connected account and its associated calendar feeds
 */
export async function deleteAccount(
  userId: string,
  input: DeleteAccountInput
): Promise<{ success: boolean }> {
  const { accountId } = DeleteAccountInputSchema.parse(input);

  logger.info("Deleting account", { userId, accountId }, LOG_SOURCE);

  // Check if the account belongs to the current user
  const account = await prisma.connectedAccount.findUnique({
    where: {
      id: accountId,
      userId,
    },
  });

  if (!account) {
    logger.warn(
      "Account deletion failed - account not found",
      { userId, accountId },
      LOG_SOURCE
    );
    throw new Error(
      "Account not found or you don't have permission to delete it"
    );
  }

  // Use transaction to ensure data consistency
  await prisma.$transaction(async (tx) => {
    // First delete all calendar feeds associated with this account
    await tx.calendarFeed.deleteMany({
      where: {
        accountId,
        userId,
      },
    });

    // Then delete the account
    await tx.connectedAccount.delete({
      where: {
        id: accountId,
        userId,
      },
    });
  });

  logger.info(
    "Account deleted successfully",
    { userId, accountId, accountProvider: account.provider },
    LOG_SOURCE
  );

  return { success: true };
}
