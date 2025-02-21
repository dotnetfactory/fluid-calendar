import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { newDate } from "./date-utils";

class Logger {
  private logFile: string;
  private logsDir: string;
  private readonly MAX_AGE_DAYS = 3;

  constructor() {
    this.logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir);
    }
    this.logFile = path.join(
      this.logsDir,
      `scheduling-${newDate().toISOString().split("T")[0]}.log`
    );
    this.cleanupOldLogs();
  }

  private cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logsDir);
      const now = newDate();

      files.forEach((file) => {
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);
        const daysOld =
          (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (daysOld > this.MAX_AGE_DAYS) {
          fs.unlinkSync(filePath);
          console.log(`Deleted old log file: ${file}`);
        }
      });
    } catch (error) {
      console.error("Failed to cleanup old logs:", error);
    }
  }

  private async getLogLevel(): Promise<string> {
    try {
      const settings = await prisma.systemSettings.findFirst();
      return settings?.logLevel || process.env.LOG_LEVEL || "none";
    } catch (error) {
      console.error("Failed to get system settings:", error);
      return process.env.LOG_LEVEL || "none";
    }
  }

  async log(message: string, data?: Record<string, unknown>) {
    const logLevel = await this.getLogLevel();
    const timestamp = newDate().toISOString();
    const logMessage = `[${timestamp}] ${message}${
      data ? "\n" + JSON.stringify(data, null, 2) : ""
    }\n`;
    if (
      process.env.NODE_ENV === "development" &&
      (logLevel === "debug" || process.env.LOG_LEVEL === "debug")
    ) {
      fs.appendFileSync(this.logFile, logMessage);
    } else {
      console.log(message, data);
    }
  }
}

export const logger = new Logger();
