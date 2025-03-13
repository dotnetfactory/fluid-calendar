import { useEffect, useMemo } from "react";
import { Command } from "@/lib/commands/types";
import { commandRegistry } from "@/lib/commands/registry";
import { useCalendarCommands } from "@/lib/commands/groups/calendar";
import { useNavigationCommands } from "@/lib/commands/groups/navigation";
import { useTaskCommands } from "@/lib/commands/groups/tasks";
import { useSystemCommands } from "@/lib/commands/groups/system";
import { useFocusCommands } from "@/lib/commands/groups/focus";
import { usePrivacyCommands } from "@/lib/commands/groups/privacy";
import { usePathname, useRouter } from "next/navigation";

export function useCommands() {
  const calendarCommands = useCalendarCommands();
  const navigationCommands = useNavigationCommands();
  const taskCommands = useTaskCommands();
  const systemCommands = useSystemCommands();
  const focusCommands = useFocusCommands();
  const privacyCommands = usePrivacyCommands();
  const pathname = usePathname();
  const router = useRouter();

  console.log(
    "useCommands initialized with router:",
    !!router,
    "pathname:",
    pathname
  );

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

    console.log(
      "Registering commands:",
      commands.map((cmd) => ({ id: cmd.id, shortcut: cmd.shortcut }))
    );

    // Register all commands
    commands.forEach((command) => {
      commandRegistry.register(command);
    });

    // Log all registered commands
    console.log(
      "All registered commands:",
      commandRegistry
        .getAll()
        .map((cmd) => ({ id: cmd.id, shortcut: cmd.shortcut }))
    );

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

      console.log(
        `Current path: ${currentPath}, Valid commands: ${validCommands.length}/${allCommands.length}`
      );

      if (allCommands.length !== validCommands.length) {
        console.log(
          "Filtered out commands:",
          allCommands
            .filter((cmd) => !isCommandValidForPath(cmd))
            .map((cmd) => ({
              id: cmd.id,
              shortcut: cmd.shortcut,
              requiredPath: cmd.context?.requiredPath,
            }))
        );
      }

      // For arrow keys, we want to handle them directly
      if (mappedKey === "left" || mappedKey === "right") {
        console.log("Arrow key pressed:", mappedKey);

        // Find a command with this shortcut that's valid for the current path
        const command = validCommands.find((cmd) => cmd.shortcut === mappedKey);

        if (command) {
          console.log("Command found for arrow key:", command.id);
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

        console.log("Modifier shortcut pressed:", shortcut);

        // Find a command with this shortcut that's valid for the current path
        const command = validCommands.find((cmd) => cmd.shortcut === shortcut);

        if (command) {
          console.log("Command found:", command.id);
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

        console.log(
          "Key combinations:",
          keyCombinations,
          "Pressed keys:",
          pressedKeys
        );

        // Find a command with any of these shortcuts that's valid for the current path
        for (const combo of keyCombinations) {
          const command = validCommands.find((cmd) => cmd.shortcut === combo);
          if (command) {
            console.log("Command found:", command.id, "for combo:", combo);
            e.preventDefault();
            console.log("Executing command with router:", !!router);
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
    console.log("Adding keydown event listener");
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      console.log("Removing keydown event listener");
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
        console.log("executeCommand called with router:", !!router);
        return commandRegistry.execute(commandId, router);
      },
    }),
    [router]
  );

  return api;
}
