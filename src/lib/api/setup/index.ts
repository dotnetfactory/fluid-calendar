import { hash } from "bcrypt";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { migrateExistingData } from "@/lib/setup-migration";

import { type SetupInput, SetupInputSchema } from "./schemas";

const LOG_SOURCE = "SetupAPI";

/**
 * Check if setup is needed by checking if any users exist
 */
export async function checkSetupStatus(): Promise<{ needsSetup: boolean }> {
  try {
    const userCount = await prisma.user.count();

    logger.info("Checked if users exist", { userCount }, LOG_SOURCE);

    return { needsSetup: userCount === 0 };
  } catch (error) {
    logger.error(
      "Failed to check if users exist",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    // If there's an error, assume setup is needed
    return { needsSetup: true };
  }
}

/**
 * Perform initial setup by creating admin user and migrating data
 */
export async function performSetup(
  input: SetupInput
): Promise<{ success: boolean; message: string }> {
  const { name, email, password } = SetupInputSchema.parse(input);

  logger.info("Starting setup process", { email }, LOG_SOURCE);

  // Check if any users already exist
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    logger.warn("Setup attempted when users already exist", {}, LOG_SOURCE);
    throw new Error("Setup has already been completed");
  }

  // Hash the password
  const hashedPassword = await hash(password, 10);

  // Create the admin user
  const adminUser = await prisma.user.create({
    data: {
      name,
      email,
      role: "admin",
      // Store the hashed password in a way that's compatible with NextAuth
      // This assumes you'll be using the credentials provider in the future
      accounts: {
        create: {
          type: "credentials",
          provider: "credentials",
          providerAccountId: email,
          // Store the hashed password in a field that won't conflict with OAuth providers
          id_token: hashedPassword,
        },
      },
    },
  });

  logger.info("Created admin user", { userId: adminUser.id }, LOG_SOURCE);

  // Migrate existing data to the admin user
  await migrateExistingData(adminUser.id);

  // Create default settings for the admin user
  await Promise.all([
    // Create user settings
    prisma.userSettings.create({
      data: {
        userId: adminUser.id,
        theme: "system",
        defaultView: "week",
        timeZone: "America/New_York", // Default timezone
        weekStartDay: "sunday",
        timeFormat: "12h",
      },
    }),

    // Create calendar settings
    prisma.calendarSettings.create({
      data: {
        userId: adminUser.id,
        workingHoursEnabled: true,
        workingHoursStart: "09:00",
        workingHoursEnd: "17:00",
        workingHoursDays: "[1,2,3,4,5]",
        defaultDuration: 60,
        defaultColor: "#3b82f6",
        defaultReminder: 30,
        refreshInterval: 5,
      },
    }),

    // Create notification settings
    prisma.notificationSettings.create({
      data: {
        userId: adminUser.id,
        emailNotifications: true,
        eventInvites: true,
        eventUpdates: true,
        eventCancellations: true,
        eventReminders: true,
        defaultReminderTiming: "[30]",
      },
    }),

    // Create integration settings
    prisma.integrationSettings.create({
      data: {
        userId: adminUser.id,
        googleCalendarEnabled: true,
        googleCalendarAutoSync: true,
        googleCalendarInterval: 5,
        outlookCalendarEnabled: true,
        outlookCalendarAutoSync: true,
        outlookCalendarInterval: 5,
      },
    }),

    // Create data settings
    prisma.dataSettings.create({
      data: {
        userId: adminUser.id,
        autoBackup: true,
        backupInterval: 7,
        retainDataFor: 365,
      },
    }),

    // Check if SystemSettings record exists and fail if it does
    prisma.$transaction(async (tx) => {
      // Check if any SystemSettings record exists
      const existingSettings = await tx.systemSettings.findFirst();

      if (existingSettings) {
        throw new Error("SystemSettings record already exists");
      }

      // Create a new record with default ID
      return tx.systemSettings.create({
        data: {
          id: "default",
          logLevel: "error",
          logDestination: "db",
          logRetention: {
            error: 30,
            warn: 14,
            info: 7,
            debug: 3,
          },
          publicSignup: false,
          resendApiKey: process.env.RESEND_API_KEY || null,
        },
      });
    }),
  ]);

  logger.info("Created default settings for admin user", {}, LOG_SOURCE);

  return { success: true, message: "Setup completed successfully" };
}
