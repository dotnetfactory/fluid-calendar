import { addDays, newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

import {
  LogBatchResponse,
  LogDestination,
  LogEntry,
  LogLevel,
  LogRetention,
  LogSettings,
} from "./types";

const DEFAULT_RETENTION: LogRetention = {
  error: 30,
  warn: 14,
  info: 7,
  debug: 3,
};

// Type guard for LogRetention
const isLogRetention = (value: unknown): value is LogRetention => {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.error === "number" &&
    typeof obj.warn === "number" &&
    typeof obj.info === "number" &&
    typeof obj.debug === "number"
  );
};

// Parse retention settings with type safety
const parseRetention = (json: unknown): LogRetention => {
  if (isLogRetention(json)) return json;
  return DEFAULT_RETENTION;
};

// Get retention days with type safety
const getRetentionDays = (level: LogLevel, retention: LogRetention): number => {
  if (level === "none") return DEFAULT_RETENTION.debug;
  return retention[level] || DEFAULT_RETENTION[level];
};

export class ServerLogger {
  private async getLogSettings(): Promise<LogSettings> {
    try {
      const settings = await prisma.systemSettings.findFirst();
      return {
        logLevel: (settings?.logLevel as LogLevel) || "none",
        logDestination: (settings?.logDestination as LogDestination) || "db",
        logRetention: parseRetention(settings?.logRetention),
      };
    } catch (error) {
      console.error("Failed to get system settings:", error);
      return {
        logLevel: "none",
        logDestination: "db",
        logRetention: DEFAULT_RETENTION,
      };
    }
  }

  private shouldLog(messageLevel: LogLevel, configLevel: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    return levels.indexOf(messageLevel) >= levels.indexOf(configLevel);
  }

  /**
   * Write a single log entry to the database
   */
  async writeLog(entry: LogEntry): Promise<boolean> {
    try {
      const settings = await this.getLogSettings();

      // Skip if logging is disabled or level is too low
      if (
        settings.logLevel === "none" ||
        !this.shouldLog(entry.level, settings.logLevel)
      ) {
        return false;
      }

      const now = newDate();
      await prisma.log.create({
        data: {
          level: entry.level,
          message: entry.message,
          metadata: entry.metadata || {},
          timestamp: entry.timestamp,
          source: entry.source,
          expiresAt: addDays(
            now,
            getRetentionDays(entry.level, settings.logRetention)
          ),
        },
      });

      console.log("Log written:", entry);

      return true;
    } catch (error) {
      console.error("Failed to write log:", error);
      return false;
    }
  }

  /**
   * Write multiple log entries to the database in a batch
   */
  async writeBatch(entries: LogEntry[]): Promise<LogBatchResponse> {
    try {
      const settings = await this.getLogSettings();
      const now = newDate();

      // Filter entries based on log level
      const validEntries = entries.filter((entry) =>
        this.shouldLog(entry.level, settings.logLevel)
      );

      if (validEntries.length === 0) {
        return { success: true, count: 0 };
      }

      const result = await prisma.log.createMany({
        data: validEntries.map((entry) => ({
          level: entry.level,
          message: entry.message,
          metadata: entry.metadata || {},
          timestamp: entry.timestamp,
          source: entry.source,
          expiresAt: addDays(
            now,
            getRetentionDays(entry.level, settings.logRetention)
          ),
        })),
      });

      return {
        success: true,
        count: result.count,
      };
    } catch (error) {
      console.error("Failed to write batch logs:", error);
      return {
        success: false,
        count: 0,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Clean up expired logs
   */
  async cleanup(): Promise<number> {
    try {
      const result = await prisma.log.deleteMany({
        where: {
          expiresAt: {
            lt: newDate(),
          },
        },
      });
      return result.count;
    } catch (error) {
      console.error("Failed to cleanup logs:", error);
      return 0;
    }
  }
}
