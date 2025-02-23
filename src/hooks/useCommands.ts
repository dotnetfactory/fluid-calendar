import { useEffect, useMemo } from "react";
import { Command } from "@/lib/commands/types";
import { commandRegistry } from "@/lib/commands/registry";
import { useCalendarCommands } from "@/lib/commands/groups/calendar";
import { useNavigationCommands } from "@/lib/commands/groups/navigation";

export function useCommands() {
  const calendarCommands = useCalendarCommands();
  const navigationCommands = useNavigationCommands();

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

  const api = useMemo(
    () => ({
      getAllCommands: () => commandRegistry.getAll(),
      getCommandsBySection: (section: Command["section"]) =>
        commandRegistry.getBySection(section),
      searchCommands: (query: string) => commandRegistry.search(query),
      executeCommand: (commandId: string) => commandRegistry.execute(commandId),
    }),
    []
  );

  return api;
}
