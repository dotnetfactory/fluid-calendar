import { Log, Prisma } from "@prisma/client";

import { newDate, subDays } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { ServerLogger } from "@/lib/logger/server";
import { LogEntry } from "@/lib/logger/types";
import { prisma } from "@/lib/prisma";

import {
  type BatchLogEntriesInput,
  BatchLogEntriesInputSchema,
  type DeleteLogsInput,
  DeleteLogsInputSchema,
  type GetLogsInput,
  GetLogsInputSchema,
  type LogSettingsInput,
  LogSettingsInputSchema,
} from "./schemas";

const LOG_SOURCE = "LogsAPI";

// Log response type with pagination
export type LogsResponse = {
  logs: Log[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    limit: number;
  };
};

// Log settings response type
export type LogSettingsResponse = {
  logLevel: string;
  logDestination: string;
  logRetention: {
    error: number;
    warn: number;
    info: number;
    debug: number;
  };
};

/**
 * Get logs with filtering and pagination
 */
export async function getLogs(
  input: Partial<GetLogsInput> = {}
): Promise<LogsResponse> {
  const validatedInput = GetLogsInputSchema.parse(input);
  const { page, limit, level, source, from, to, search } = validatedInput;

  logger.debug(
    "Fetching logs with params",
    {
      page: String(page),
      limit: String(limit),
      level: level || "none",
      source: source || "none",
      from: from || "none",
      to: to || "none",
      search: search || "none",
    },
    LOG_SOURCE
  );

  // Build where clause
  const where: Prisma.LogWhereInput = {};
  if (level) where.level = level;
  if (source) where.source = source;
  if (from || to) {
    where.timestamp = {};
    if (from) where.timestamp.gte = new Date(from);
    if (to) where.timestamp.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { message: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get total count for pagination
  const total = await prisma.log.count({ where });

  // Get logs with pagination
  const logs = await prisma.log.findMany({
    where,
    orderBy: { timestamp: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  logger.debug(
    "Successfully fetched logs",
    {
      totalLogs: String(total),
      returnedLogs: String(logs.length),
    },
    LOG_SOURCE
  );

  return {
    logs,
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      current: page,
      limit,
    },
  };
}

/**
 * Delete logs based on criteria
 */
export async function deleteLogs(
  input: DeleteLogsInput = {}
): Promise<{ message: string; count: number }> {
  const validatedInput = DeleteLogsInputSchema.parse(input);
  const { olderThan, level } = validatedInput;

  logger.info(
    "Deleting logs",
    {
      olderThan: olderThan ? String(olderThan) : "none",
      level: level || "none",
    },
    LOG_SOURCE
  );

  const where: Prisma.LogWhereInput = {};

  // Delete logs older than specified days
  if (olderThan) {
    where.timestamp = {
      lt: subDays(newDate(), olderThan),
    };
  }

  // Delete logs of specific level
  if (level) {
    where.level = level;
  }

  // Delete expired logs if no filters provided
  if (!olderThan && !level) {
    where.expiresAt = {
      lt: newDate(),
    };
  }

  const { count } = await prisma.log.deleteMany({ where });

  logger.info(
    "Successfully deleted logs",
    {
      deletedCount: String(count),
    },
    LOG_SOURCE
  );

  return {
    message: `Deleted ${count} logs`,
    count,
  };
}

/**
 * Process batch log entries
 */
export async function processBatchLogs(
  input: BatchLogEntriesInput
): Promise<{ success: boolean; processed: number }> {
  const { entries } = BatchLogEntriesInputSchema.parse(input);

  if (!Array.isArray(entries)) {
    throw new Error("Invalid request body - entries must be an array");
  }

  const serverLogger = new ServerLogger();
  const result = await serverLogger.writeBatch(
    entries as unknown as LogEntry[]
  );

  return {
    processed: entries.length,
    ...result,
  };
}

/**
 * Cleanup expired logs
 */
export async function cleanupExpiredLogs(): Promise<{
  message: string;
  count: number;
}> {
  // Delete all expired logs
  const { count } = await prisma.log.deleteMany({
    where: {
      expiresAt: {
        lt: newDate(),
      },
    },
  });

  return {
    message: `Cleaned up ${count} expired logs`,
    count,
  };
}

/**
 * Get log settings
 */
export async function getLogSettings(): Promise<LogSettingsResponse> {
  const settings = await prisma.systemSettings.findFirst();

  // If no settings exist, create default settings
  if (!settings) {
    logger.info("No system settings found, creating defaults", {}, LOG_SOURCE);

    const defaultSettings = await prisma.systemSettings.create({
      data: {
        logLevel: "error",
        logDestination: "db",
        logRetention: {
          error: 30,
          warn: 14,
          info: 7,
          debug: 3,
        },
        publicSignup: false,
      },
    });

    return {
      logLevel: defaultSettings.logLevel,
      logDestination: defaultSettings.logDestination,
      logRetention: defaultSettings.logRetention as {
        error: number;
        warn: number;
        info: number;
        debug: number;
      },
    };
  }

  return {
    logLevel: settings?.logLevel || "none",
    logDestination: settings?.logDestination || "db",
    logRetention: (settings?.logRetention as {
      error: number;
      warn: number;
      info: number;
      debug: number;
    }) || {
      error: 30,
      warn: 14,
      info: 7,
      debug: 3,
    },
  };
}

/**
 * Update log settings
 */
export async function updateLogSettings(
  input: LogSettingsInput
): Promise<LogSettingsResponse> {
  const validatedInput = LogSettingsInputSchema.parse(input);
  const { logLevel, logDestination, logRetention } = validatedInput;

  const settingsInDb = await prisma.systemSettings.findFirst();

  // Update or create settings
  const settings = await prisma.systemSettings.upsert({
    where: { id: settingsInDb?.id ?? "NEW" },
    update: {
      ...(logLevel && { logLevel }),
      ...(logDestination && { logDestination }),
      ...(logRetention && { logRetention }),
    },
    create: {
      logLevel: logLevel || "none",
      logDestination: logDestination || "db",
      logRetention: logRetention || {
        error: 30,
        warn: 14,
        info: 7,
        debug: 3,
      },
    },
  });

  return {
    logLevel: settings.logLevel,
    logDestination: settings.logDestination,
    logRetention: settings.logRetention as {
      error: number;
      warn: number;
      info: number;
      debug: number;
    },
  };
}

/**
 * Get all unique log sources
 */
export async function getLogSources(): Promise<{ sources: string[] }> {
  // Get all unique sources
  const sources = await prisma.log.findMany({
    distinct: ["source"],
    select: { source: true },
    where: {
      source: {
        not: null,
      },
    },
  });

  logger.debug(
    "Successfully fetched log sources",
    {
      sourceCount: String(sources.length),
    },
    LOG_SOURCE
  );

  return {
    sources: sources
      .map((s) => s.source)
      .filter((source): source is string => Boolean(source))
      .sort(),
  };
}
