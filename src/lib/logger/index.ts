import { ClientLogger } from "./client";
import { ServerLogger } from "./server";
import { LogLevel, LogMetadata, LogStorageConfig } from "./types";

class Logger {
  private static instance: Logger;
  private clientLogger: ClientLogger | null = null;
  private serverLogger: ServerLogger | null = null;
  private isClient: boolean;

  private constructor(config?: Partial<LogStorageConfig>) {
    this.isClient = typeof window !== "undefined";

    // Only create client logger if we're in a browser context
    if (this.isClient) {
      this.clientLogger = new ClientLogger(config);
    }

    // Only create server logger if we're in a server context
    if (!this.isClient) {
      this.serverLogger = new ServerLogger();
    }
  }

  public static getInstance(config?: Partial<LogStorageConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  async log(message: string, metadata?: LogMetadata, source?: string) {
    this.debug(message, metadata, source);
  }

  async debug(message: string, metadata?: LogMetadata, source?: string) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "debug" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else if (this.clientLogger) {
      await this.clientLogger.debug(message, metadata, source);
    } else {
      // Fallback to console in case neither logger is available
      console.debug(message, metadata);
    }
  }

  async info(message: string, metadata?: LogMetadata, source?: string) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "info" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else if (this.clientLogger) {
      await this.clientLogger.info(message, metadata, source);
    } else {
      console.info(message, metadata);
    }
  }

  async warn(message: string, metadata?: LogMetadata, source?: string) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "warn" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else if (this.clientLogger) {
      await this.clientLogger.warn(message, metadata, source);
    } else {
      console.warn(message, metadata);
    }
  }

  async error(message: string, metadata?: LogMetadata, source?: string) {
    if (this.serverLogger) {
      await this.serverLogger.writeLog({
        level: "error" as LogLevel,
        message,
        metadata,
        source,
        timestamp: new Date(),
      });
    } else if (this.clientLogger) {
      await this.clientLogger.error(message, metadata, source);
    } else {
      console.error(message, metadata);
    }
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();
