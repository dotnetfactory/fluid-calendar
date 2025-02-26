import { Command } from "../types";

export function useSystemCommands(): Command[] {
  return [
    {
      id: "view-logs",
      title: "View System Logs",
      keywords: ["logs", "view logs", "system logs", "log viewer"],
      section: "system",
      perform: async (router) => {
        if (router) {
          router.push("/settings#logs");
        }
      },
    },
    {
      id: "cleanup-logs",
      title: "Cleanup Expired Logs",
      keywords: ["cleanup logs", "delete logs", "remove logs", "clear logs"],
      section: "system",
      perform: async () => {
        await fetch("/api/logs/cleanup", { method: "POST" });
      },
    },
    {
      id: "configure-logging",
      title: "Configure Logging Settings",
      keywords: ["log settings", "configure logs", "logging configuration"],
      section: "system",
      perform: async (router) => {
        if (router) {
          router.push("/settings#logs");
        }
      },
    },
  ];
}
