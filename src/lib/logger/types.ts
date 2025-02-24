export type LogLevel = "none" | "debug" | "info" | "warn" | "error";
export type LogDestination = "db" | "file" | "both";

// Strongly typed metadata to match Prisma's JSON expectations
export type LogMetadata = Record<
  string,
  | string
  | number
  | boolean
  | null
  | LogMetadata[]
  | string[]
  | { [key: string]: LogMetadata }
>;

export interface LogRetention {
  error: number; // days
  warn: number; // days
  info: number; // days
  debug: number; // days
}

export interface LogSettings {
  logLevel: LogLevel;
  logDestination: LogDestination;
  logRetention: LogRetention;
}

// Base log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  metadata?: LogMetadata;
  source?: string;
  timestamp: Date;
}

// Client-side buffered log entry
export interface BufferedLogEntry extends LogEntry {
  id: string; // Client-generated ID for tracking
  attempts?: number; // Number of send attempts
  lastAttempt?: Date; // Last attempt timestamp
}

// Server response for batch log operations
export interface LogBatchResponse {
  success: boolean;
  count: number;
  errors?: string[];
  failedIds?: string[]; // IDs of logs that failed to process
}

// Client storage configuration
export interface LogStorageConfig {
  maxBufferSize: number; // Maximum number of logs to keep in memory
  flushInterval: number; // How often to flush logs to server (ms)
  maxRetries: number; // Maximum number of retry attempts
  retryDelay: number; // Delay between retries (ms)
  compressionThreshold: number; // Size threshold for compression (bytes)
}

// Default configuration values
export const DEFAULT_STORAGE_CONFIG: LogStorageConfig = {
  maxBufferSize: 100,
  flushInterval: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  compressionThreshold: 1024, // 1KB
};
