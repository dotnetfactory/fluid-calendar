import { LogLevel, LogMetadata } from "./types";

interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  app: string;
  environment: string;
  source?: string;
  metadata?: LogMetadata;
  // Kubernetes context (will be added by Promtail)
  namespace?: string;
  pod?: string;
  container?: string;
  // Request context
  request_id?: string;
  user_id?: string;
}

class Logger {
  private static instance: Logger;
  private isClient: boolean;
  private service: string;
  private app: string;
  private environment: string;
  private namespace?: string;

  private constructor() {
    this.isClient = typeof window !== "undefined";

    // App identification
    this.app = process.env.NEXT_PUBLIC_APP_NAME || "fluid-calendar";

    // Service identification (can be different from app for microservices)
    this.service = process.env.SERVICE_NAME || this.app;

    // Environment detection
    this.environment = this.detectEnvironment();

    // Kubernetes namespace detection
    this.namespace =
      process.env.KUBERNETES_NAMESPACE || process.env.POD_NAMESPACE;
  }

  private detectEnvironment(): string {
    // Check explicit environment variable first
    if (process.env.ENVIRONMENT) {
      return process.env.ENVIRONMENT;
    }

    // Check NODE_ENV
    if (process.env.NODE_ENV === "production") {
      // In production, try to detect staging vs prod based on other indicators
      if (
        process.env.INFISICAL_SECRET_ENV === "staging" ||
        process.env.NEXT_PUBLIC_ENVIRONMENT === "staging" ||
        this.namespace === "fluid-calendar-staging"
      ) {
        return "staging";
      }
      return "production";
    }

    if (process.env.NODE_ENV === "development") {
      return "development";
    }

    // Fallback based on namespace or other indicators
    if (this.namespace?.includes("staging")) {
      return "staging";
    }

    if (this.namespace?.includes("prod")) {
      return "production";
    }

    return "development";
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    source?: string
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      app: this.app,
      environment: this.environment,
      source,
      metadata,
    };

    // Add Kubernetes context if available
    if (this.namespace) {
      entry.namespace = this.namespace;
    }

    // Extract request_id and user_id from metadata if present
    if (metadata) {
      if (typeof metadata === "object" && metadata !== null) {
        if ("request_id" in metadata) {
          entry.request_id = String(metadata.request_id);
        }
        if ("user_id" in metadata) {
          entry.user_id = String(metadata.user_id);
        }
        if ("userId" in metadata) {
          entry.user_id = String(metadata.userId);
        }
      }
    }

    return entry;
  }

  private outputLog(entry: StructuredLogEntry): void {
    const logString = JSON.stringify(entry);

    if (this.isClient) {
      // Client-side: use console methods for browser dev tools
      switch (entry.level) {
        case "error":
          console.error(logString);
          break;
        case "warn":
          console.warn(logString);
          break;
        case "info":
          console.info(logString);
          break;
        case "debug":
        default:
          console.log(logString);
          break;
      }
    } else {
      // Server-side: output to stdout/stderr for container logging
      switch (entry.level) {
        case "error":
          process.stderr.write(logString + "\n");
          break;
        case "warn":
        case "info":
        case "debug":
        default:
          process.stdout.write(logString + "\n");
          break;
      }
    }
  }

  // Backward compatible methods that match the existing logger interface
  async log(
    message: string,
    metadata?: LogMetadata,
    source?: string
  ): Promise<void> {
    return this.debug(message, metadata, source);
  }

  async debug(
    message: string,
    metadata?: LogMetadata,
    source?: string
  ): Promise<void> {
    const entry = this.createLogEntry("debug", message, metadata, source);
    this.outputLog(entry);
  }

  async info(
    message: string,
    metadata?: LogMetadata,
    source?: string
  ): Promise<void> {
    const entry = this.createLogEntry("info", message, metadata, source);
    this.outputLog(entry);
  }

  async warn(
    message: string,
    metadata?: LogMetadata,
    source?: string
  ): Promise<void> {
    const entry = this.createLogEntry("warn", message, metadata, source);
    this.outputLog(entry);
  }

  async error(
    message: string,
    metadata?: LogMetadata,
    source?: string
  ): Promise<void> {
    const entry = this.createLogEntry("error", message, metadata, source);
    this.outputLog(entry);
  }

  // Additional utility methods for enhanced logging
  async logWithContext(
    level: LogLevel,
    message: string,
    context: {
      metadata?: LogMetadata;
      source?: string;
      request_id?: string;
      user_id?: string;
    }
  ): Promise<void> {
    const enhancedMetadata = {
      ...context.metadata,
      ...(context.request_id && { request_id: context.request_id }),
      ...(context.user_id && { user_id: context.user_id }),
    };

    switch (level) {
      case "error":
        return this.error(message, enhancedMetadata, context.source);
      case "warn":
        return this.warn(message, enhancedMetadata, context.source);
      case "info":
        return this.info(message, enhancedMetadata, context.source);
      case "debug":
      default:
        return this.debug(message, enhancedMetadata, context.source);
    }
  }

  // Method to get current logger configuration
  getConfig() {
    return {
      app: this.app,
      service: this.service,
      environment: this.environment,
      namespace: this.namespace,
      isClient: this.isClient,
    };
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();
