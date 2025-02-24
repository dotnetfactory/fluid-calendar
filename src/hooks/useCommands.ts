import { useEffect, useMemo } from "react";
import { Command } from "@/lib/commands/types";
import { commandRegistry } from "@/lib/commands/registry";
import { useCalendarCommands } from "@/lib/commands/groups/calendar";
import { useNavigationCommands } from "@/lib/commands/groups/navigation";
import { usePathname, useRouter } from "next/navigation";

export function useCommands() {
  const calendarCommands = useCalendarCommands();
  const navigationCommands = useNavigationCommands();
  const pathname = usePathname();
  const router = useRouter();

  // Register commands on mount
  useEffect(() => {
    const commands = [
      ...calendarCommands,
      ...navigationCommands,
      // Add other command groups here as we create them
    ];

    // Register all commands
    commands.forEach((command) => {
      commandRegistry.register(command);
    });

    // Cleanup on unmount
    return () => {
      commands.forEach((command) => {
        commandRegistry.unregister(command.id);
      });
    };
  }, [calendarCommands, navigationCommands]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Normalize key names
      const keyMap: Record<string, string> = {
        ArrowLeft: "left",
        ArrowRight: "right",
      };

      const pressedKey = keyMap[e.key] || e.key.toLowerCase();
      const commands = commandRegistry.getAll();
      const command = commands.find((cmd) => cmd.shortcut === pressedKey);

      if (command) {
        e.preventDefault();
        await commandRegistry.execute(command.id, router);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router]); // Add router to dependencies

  const api = useMemo(
    () => ({
      getAllCommands: () => commandRegistry.getAll(),
      getCommandsBySection: (section: Command["section"]) =>
        commandRegistry.getBySection(section),
      searchCommands: (query: string) => commandRegistry.search(query),
      executeCommand: (commandId: string) =>
        commandRegistry.execute(commandId, router),
    }),
    [router]
  );

  return api;
}
