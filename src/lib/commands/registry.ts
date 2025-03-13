import { Command, CommandRegistry } from "./types";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

class CommandRegistryImpl {
  private commands: CommandRegistry = new Map();

  register(command: Command) {
    console.log(
      `Registering command: ${command.id} with shortcut: ${command.shortcut}`
    );
    if (!command.id) {
      console.error("Attempted to register command without ID:", command);
      return;
    }
    this.commands.set(command.id, command);
  }

  unregister(commandId: string) {
    console.log(`Unregistering command: ${commandId}`);
    if (!commandId) {
      console.error("Attempted to unregister command without ID");
      return;
    }
    this.commands.delete(commandId);
  }

  getAll(): Command[] {
    const commands = Array.from(this.commands.values());
    console.log(`Getting all commands: ${commands.length} commands found`);
    return commands;
  }

  getBySection(section: Command["section"]): Command[] {
    return this.getAll().filter((command) => command.section === section);
  }

  search(query: string): Command[] {
    const searchTerms = query.toLowerCase().split(" ");
    return this.getAll().filter((command) => {
      const searchableText = [
        command.title.toLowerCase(),
        ...command.keywords.map((k) => k.toLowerCase()),
      ].join(" ");

      return searchTerms.every((term) => searchableText.includes(term));
    });
  }

  async execute(commandId: string, router?: AppRouterInstance) {
    const command = this.commands.get(commandId);
    if (!command) {
      console.error(`Command ${commandId} not found`);
      throw new Error(`Command ${commandId} not found`);
    }

    console.log(`Executing command: ${commandId}`, {
      id: command.id,
      shortcut: command.shortcut,
      requiredPath: command.context?.requiredPath,
      navigateIfNeeded: command.context?.navigateIfNeeded,
      hasRouter: !!router,
    });

    // Check if the command has a required path
    if (command.context?.requiredPath && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

      // If we're not on the required path
      if (currentPath !== command.context.requiredPath) {
        console.log(
          `Command ${commandId} requires path ${command.context.requiredPath}, current path is ${currentPath}`
        );

        // If navigateIfNeeded is true and we have a router, navigate
        if (command.context.navigateIfNeeded && router) {
          console.log(
            `Navigating to ${command.context.requiredPath} before executing command`
          );
          await router.push(command.context.requiredPath);
          // Wait for navigation
          await new Promise((resolve) => setTimeout(resolve, 100));
        } else if (command.context.navigateIfNeeded && !router) {
          console.error(
            `Command ${commandId} needs to navigate but no router was provided`
          );
          return; // Don't execute the command if we can't navigate
        } else {
          // If navigateIfNeeded is false, log a warning
          console.log(`Not navigating, command may not work as expected`);
        }
      }
    }

    try {
      return await command.perform(router);
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      throw error;
    }
  }
}

export const commandRegistry = new CommandRegistryImpl();
