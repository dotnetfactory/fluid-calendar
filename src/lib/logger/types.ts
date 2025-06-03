export type LogLevel = "debug" | "info" | "warn" | "error";

// Strongly typed metadata to match our structured logging format
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
