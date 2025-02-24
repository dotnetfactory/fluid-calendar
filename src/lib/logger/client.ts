import { newDate } from "@/lib/date-utils";
import {
  LogLevel,
  LogEntry,
  BufferedLogEntry,
  LogStorageConfig,
  DEFAULT_STORAGE_CONFIG,
  LogBatchResponse,
} from "./types";

/**
 * Client-side logger that buffers logs in memory and localStorage,
 * then sends them to the server in batches.
 */
export class ClientLogger {
  private buffer: BufferedLogEntry[] = [];
  private config: LogStorageConfig;
  private flushTimer: NodeJS.Timeout | null = null;
  private storageKey = "fluid_calendar_logs";

  constructor(config: Partial<LogStorageConfig> = {}) {
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    this.restoreBuffer();
    this.startFlushTimer();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private async restoreBuffer() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const logs = JSON.parse(stored) as BufferedLogEntry[];
        this.buffer.push(...logs);
        // Clear storage after successful restore
        localStorage.removeItem(this.storageKey);
      }
    } catch (error) {
      console.error("Failed to restore log buffer:", error);
    }
  }

  private saveBuffer() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.buffer));
    } catch (error) {
      console.error("Failed to save log buffer:", error);
      // If localStorage is full, try to save only the most recent logs
      if (error instanceof Error && error.name === "QuotaExceededError") {
        const halfSize = Math.floor(this.buffer.length / 2);
        const recentLogs = this.buffer.slice(-halfSize);
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(recentLogs));
        } catch {
          // If still fails, just log to console
          console.error("Failed to save even half of the log buffer");
        }
      }
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  private async sendBatch(
    entries: BufferedLogEntry[]
  ): Promise<LogBatchResponse> {
    try {
      const response = await fetch("/api/logs/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entries),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to send log batch:", error);
      return {
        success: false,
        count: 0,
        errors: [(error as Error).message],
        failedIds: entries.map((e) => e.id),
      };
    }
  }

  /**
   * Flush the buffer to the server
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const now = newDate();
    const batch = this.buffer.filter((entry) => {
      const shouldRetry =
        !entry.attempts || // Never tried
        (entry.attempts < this.config.maxRetries && // Haven't exceeded max retries
          (!entry.lastAttempt || // No last attempt
            now.getTime() - entry.lastAttempt.getTime() >=
              this.config.retryDelay)); // Enough time has passed

      return shouldRetry;
    });

    if (batch.length === 0) return;

    // Update attempt counters
    batch.forEach((entry) => {
      entry.attempts = (entry.attempts || 0) + 1;
      entry.lastAttempt = now;
    });

    const response = await this.sendBatch(batch);

    if (response.success) {
      // Remove successful entries from buffer
      const successIds = new Set(
        batch.map((e) => e.id).filter((id) => !response.failedIds?.includes(id))
      );
      this.buffer = this.buffer.filter((e) => !successIds.has(e.id));
    }

    // Save remaining buffer to localStorage
    this.saveBuffer();
  }

  /**
   * Add a log entry to the buffer
   */
  async log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    source?: string
  ): Promise<void> {
    const entry: BufferedLogEntry = {
      id: this.generateId(),
      level,
      message,
      metadata,
      source,
      timestamp: newDate(),
    };

    this.buffer.push(entry);

    // If buffer exceeds max size, force a flush
    if (this.buffer.length >= this.config.maxBufferSize) {
      await this.flush();
    }

    // Always save to localStorage as backup
    this.saveBuffer();

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console[level === "error" ? "error" : "log"](message, metadata);
    }
  }

  // Convenience methods
  async debug(
    message: string,
    metadata?: Record<string, any>,
    source?: string
  ) {
    return this.log("debug", message, metadata, source);
  }

  async info(message: string, metadata?: Record<string, any>, source?: string) {
    return this.log("info", message, metadata, source);
  }

  async warn(message: string, metadata?: Record<string, any>, source?: string) {
    return this.log("warn", message, metadata, source);
  }

  async error(
    message: string,
    metadata?: Record<string, any>,
    source?: string
  ) {
    return this.log("error", message, metadata, source);
  }
}
