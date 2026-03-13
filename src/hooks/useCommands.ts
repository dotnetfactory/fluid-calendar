import { useEffect, useMemo } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useCalendarCommands } from "@/lib/commands/groups/calendar";
import { useFocusCommands } from "@/lib/commands/groups/focus";
import { useNavigationCommands } from "@/lib/commands/groups/navigation";
import { usePrivacyCommands } from "@/lib/commands/groups/privacy";
import { useSystemCommands } from "@/lib/commands/groups/system";
import { useTaskCommands } from "@/lib/commands/groups/tasks";
import { commandRegistry } from "@/lib/commands/registry";
import { Command } from "@/lib/commands/types";

export function useCommands() {
  const calendarCommands = useCalendarCommands();
  const navigationCommands = useNavigationCommands();
  const taskCommands = useTaskCommands();
  const systemCommands = useSystemCommands();
  const focusCommands = useFocusCommands();
  const privacyCommands = usePrivacyCommands();
  const pathname = usePathname();
  const router = useRouter();

  // Register commands on mount
  useEffect(() => {
    // Clear existing commands to avoid duplicates
    const existingCommands = commandRegistry.getAll();
    existingCommands.forEach((cmd) => {
      commandRegistry.unregister(cmd.id);
    });

    const commands = [
      ...calendarCommands,
      ...navigationCommands,
      ...taskCommands,
      ...systemCommands,
      ...focusCommands,
      ...privacyCommands,
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
  }, [
    calendarCommands,
    navigationCommands,
    taskCommands,
    systemCommands,
    focusCommands,
    privacyCommands,
  ]);

  // Handle keyboard shortcuts
  useEffect(() => {
    // Map arrow keys to their shortcut names
    const keyMap: Record<string, string> = {
      arrowleft: "left",
      arrowright: "right",
      arrowup: "up",
      arrowdown: "down",
    };

    // For letter-based shortcuts
    let pressedKeys: string[] = [];
    let lastKeyPressTime = 0;
    const KEY_SEQUENCE_TIMEOUT = 1000; // 1 second timeout for key sequences

    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Get the key and apply mapping if needed
      const key = e.key.toLowerCase();
      const mappedKey = keyMap[key] || key;

      // Get the current path for context checking
      const currentPath = pathname || "/";

      // Helper function to check if a command is valid for the current path
      const isCommandValidForPath = (command: Command): boolean => {
        // If no context or no requiredPath, command is valid everywhere
        if (!command.context || !command.context.requiredPath) return true;

        // If the command's required path matches the current path, it's valid
        if (command.context.requiredPath === currentPath) return true;

        // If the command has navigateIfNeeded=true, it's valid on any path
        if (command.context.navigateIfNeeded) return true;

        // Otherwise, it's not valid
        return false;
      };

      // Get all commands and filter by current path
      const allCommands = commandRegistry.getAll();
      const validCommands = allCommands.filter(isCommandValidForPath);

      // For arrow keys, we want to handle them directly
      if (mappedKey === "left" || mappedKey === "right") {
        // Find a command with this shortcut that's valid for the current path
        const command = validCommands.find((cmd) => cmd.shortcut === mappedKey);

        if (command) {
          e.preventDefault();
          await commandRegistry.execute(command.id, router);
          return;
        }
      }

      // Check if we're using modifier keys or letter sequences
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        // Using modifier keys
        // Build the shortcut string with modifiers
        let shortcut = "";
        if (e.altKey) shortcut += "alt+";
        if (e.ctrlKey) shortcut += "ctrl+";
        if (e.metaKey) shortcut += "meta+";
        if (e.shiftKey) shortcut += "shift+";
        shortcut += mappedKey;

        // Find a command with this shortcut that's valid for the current path
        const command = validCommands.find((cmd) => cmd.shortcut === shortcut);

        if (command) {
          e.preventDefault();
          await commandRegistry.execute(command.id, router);
        }
      } else {
        // Using letter sequences
        const currentTime = Date.now();

        // If it's been too long since the last keypress, reset the sequence
        if (currentTime - lastKeyPressTime > KEY_SEQUENCE_TIMEOUT) {
          pressedKeys = [];
        }

        // Add the current key to the sequence
        pressedKeys.push(mappedKey);
        lastKeyPressTime = currentTime;

        // Only keep the last 3 keys (for efficiency)
        if (pressedKeys.length > 3) {
          pressedKeys = pressedKeys.slice(-3);
        }

        // Try different combinations of the pressed keys
        const keyCombinations = [
          pressedKeys.join(""), // All keys together
          pressedKeys.slice(-2).join(""), // Last 2 keys
          pressedKeys.slice(-1).join(""), // Just the last key
        ];

        // Find a command with any of these shortcuts that's valid for the current path
        for (const combo of keyCombinations) {
          const command = validCommands.find((cmd) => cmd.shortcut === combo);
          if (command) {
            e.preventDefault();
            await commandRegistry.execute(command.id, router);
            // Reset the sequence after executing a command
            pressedKeys = [];
            break;
          } else {
            // Check if there's a command with this shortcut that was filtered out
            const filteredCommand = allCommands.find(
              (cmd) => cmd.shortcut === combo && !isCommandValidForPath(cmd)
            );
            if (filteredCommand) {
              console.log(
                "Command found but filtered out:",
                filteredCommand.id,
                "for combo:",
                combo,
                "requiredPath:",
                filteredCommand.context?.requiredPath,
                "navigateIfNeeded:",
                filteredCommand.context?.navigateIfNeeded
              );
            }
          }
        }
      }
    };

    // Add event listener
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pathname, router]);

  const api = useMemo(
    () => ({
      getAllCommands: () => commandRegistry.getAll(),
      getCommandsBySection: (section: Command["section"]) =>
        commandRegistry.getBySection(section),
      searchCommands: (query: string) => commandRegistry.search(query),
      executeCommand: (commandId: string) => {
        return commandRegistry.execute(commandId, router);
      },
    }),
    [router]
  );

  return api;
}
