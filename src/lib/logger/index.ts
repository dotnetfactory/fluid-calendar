import { ClientLogger } from "./client";
import { ServerLogger } from "./server";
import { LogLevel, LogStorageConfig } from "./types";

class Logger {
  private static instance: Logger;
  private clientLogger: ClientLogger;
  private serverLogger: ServerLogger | null = null;

  private constructor(config?: Partial<LogStorageConfig>) {
    this.clientLogger = new ClientLogger(config);
    // Only create server logger if we're in a server context
    if (typeof window === "undefined") {
      this.serverLogger = new ServerLogger();
    }
  }

  public static getInstance(config?: Partial<LogStorageConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  async debug(
    message: string,
    metadata?: Record<string, any>,
    source?: string
  ) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "debug" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else {
      await this.clientLogger.debug(message, metadata, source);
    }
  }

  async info(message: string, metadata?: Record<string, any>, source?: string) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "info" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else {
      await this.clientLogger.info(message, metadata, source);
    }
  }

  async warn(message: string, metadata?: Record<string, any>, source?: string) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "warn" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else {
      await this.clientLogger.warn(message, metadata, source);
    }
  }

  async error(
    message: string,
    metadata?: Record<string, any>,
    source?: string
  ) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "error" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else {
      await this.clientLogger.error(message, metadata, source);
    }
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();
