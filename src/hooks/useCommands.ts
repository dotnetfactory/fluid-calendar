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
    let pressedKeys: string[] = [];

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Add the pressed key to the array if not already present
      const key = e.key.toLowerCase();
      if (!pressedKeys.includes(key)) {
        pressedKeys.push(key);
      }

      // Get the current combination of pressed keys
      const currentShortcut = pressedKeys.join("");

      const commands = commandRegistry.getAll();
      const command = commands.find((cmd) => cmd.shortcut === currentShortcut);

      if (command) {
        e.preventDefault();
        await commandRegistry.execute(command.id, router);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Remove the released key from the array
      const key = e.key.toLowerCase();
      pressedKeys = pressedKeys.filter((k) => k !== key);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [pathname, router]);

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
