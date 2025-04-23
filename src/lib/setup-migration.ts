import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "SetupMigration";

/**
 * Migrates existing data to be associated with the admin user
 * This is used during the first-time setup process
 * @param adminUserId The ID of the admin user to associate data with
 */
export async function migrateExistingData(adminUserId: string) {
  logger.info(
    "Starting migration of existing data to admin user",
    { adminUserId },
    LOG_SOURCE
  );

  try {
    // Migrate CalendarFeeds - this table has a userId field
    const calendarFeeds = await prisma.calendarFeed.findMany({
      where: {
        userId: null,
      },
    });

    logger.info(
      "Found calendar feeds to migrate",
      { count: calendarFeeds.length },
      LOG_SOURCE
    );

    if (calendarFeeds.length > 0) {
      const calendarFeedCount = await prisma.calendarFeed.updateMany({
        where: {
          userId: null,
        },
        data: {
          userId: adminUserId,
        },
      });

      logger.info(
        "Migrated calendar feeds",
        { count: calendarFeedCount.count },
        LOG_SOURCE
      );
    }

    // Migrate ConnectedAccounts - now has a userId field
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: {
        userId: null,
      },
    });

    logger.info(
      "Found connected accounts to migrate",
      { count: connectedAccounts.length },
      LOG_SOURCE
    );

    if (connectedAccounts.length > 0) {
      const connectedAccountCount = await prisma.connectedAccount.updateMany({
        where: {
          userId: null,
        },
        data: {
          userId: adminUserId,
        },
      });

      logger.info(
        "Migrated connected accounts",
        { count: connectedAccountCount.count },
        LOG_SOURCE
      );
    }

    // Migrate Tags - now has a userId field
    const tags = await prisma.tag.findMany({
      where: {
        userId: null,
      },
    });

    logger.info("Found tags to migrate", { count: tags.length }, LOG_SOURCE);

    if (tags.length > 0) {
      const tagCount = await prisma.tag.updateMany({
        where: {
          userId: null,
        },
        data: {
          userId: adminUserId,
        },
      });

      logger.info("Migrated tags", { count: tagCount.count }, LOG_SOURCE);
    }

    // Migrate Tasks - now has a userId field
    const tasks = await prisma.task.findMany({
      where: {
        userId: null,
      },
    });

    logger.info("Found tasks to migrate", { count: tasks.length }, LOG_SOURCE);

    if (tasks.length > 0) {
      const taskCount = await prisma.task.updateMany({
        where: {
          userId: null,
        },
        data: {
          userId: adminUserId,
        },
      });

      logger.info("Migrated tasks", { count: taskCount.count }, LOG_SOURCE);
    }

    // Migrate Projects - now has a userId field
    const projects = await prisma.project.findMany({
      where: {
        userId: null,
      },
    });

    logger.info(
      "Found projects to migrate",
      { count: projects.length },
      LOG_SOURCE
    );

    if (projects.length > 0) {
      const projectCount = await prisma.project.updateMany({
        where: {
          userId: null,
        },
        data: {
          userId: adminUserId,
        },
      });

      logger.info(
        "Migrated projects",
        { count: projectCount.count },
        LOG_SOURCE
      );
    }

    // Create AutoScheduleSettings for the admin user if they don't exist
    const existingAutoScheduleSettings =
      await prisma.autoScheduleSettings.findUnique({
        where: {
          userId: adminUserId,
        },
      });

    if (!existingAutoScheduleSettings) {
      await prisma.autoScheduleSettings.create({
        data: {
          userId: adminUserId,
          workDays: "[1,2,3,4,5]", // Monday to Friday
          workHourStart: 9,
          workHourEnd: 17,
          bufferMinutes: 15,
        },
      });
      logger.info(
        "Created auto schedule settings for admin user",
        {},
        LOG_SOURCE
      );
    }

    logger.info(
      "Migration of existing data completed successfully",
      {},
      LOG_SOURCE
    );
    return { success: true };
  } catch (error) {
    logger.error(
      "Failed to migrate existing data",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
    throw error;
  }
}
