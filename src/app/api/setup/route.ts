import { NextResponse } from "next/server";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { migrateExistingData } from "@/lib/setup-migration";

const LOG_SOURCE = "SetupAPI";

/**
 * POST /api/setup
 * Creates the initial admin user and migrates existing data
 */
export async function POST(request: Request) {
  try {
    // Check if any users already exist
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      logger.warn("Setup attempted when users already exist", {}, LOG_SOURCE);
      return NextResponse.json(
        { error: "Setup has already been completed" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, email, password } = body;

    // Validate input
    if (!name || !email || !password) {
      logger.warn(
        "Invalid setup request - missing required fields",
        {},
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
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
    ]);

    logger.info("Created default settings for admin user", {}, LOG_SOURCE);

    return NextResponse.json(
      { success: true, message: "Setup completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    logger.error(
      "Setup process failed",
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );

    return NextResponse.json(
      { error: "Failed to complete setup" },
      { status: 500 }
    );
  }
}
