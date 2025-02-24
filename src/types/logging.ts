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
  | { [key: string]: LogMetadata }
>;

export interface LogRetention {
  error: number; // days
  warn: number; // days
  info: number; // days
  debug: number; // days
}

export interface Log {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata: LogMetadata;
  source?: string;
  expiresAt: string;
}

export interface LogSettings {
  logLevel: LogLevel;
  logDestination: LogDestination;
  logRetention: LogRetention;
}
