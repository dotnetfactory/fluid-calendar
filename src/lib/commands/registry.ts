import { Command, CommandRegistry } from "./types";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

class CommandRegistryImpl {
  private commands: CommandRegistry = new Map();

  register(command: Command) {
    this.commands.set(command.id, command);
  }

  unregister(commandId: string) {
    this.commands.delete(commandId);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
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
      throw new Error(`Command ${commandId} not found`);
    }

    if (
      command.context?.navigateIfNeeded &&
      typeof window !== "undefined" &&
      router
    ) {
      const currentPath = window.location.pathname;
      if (currentPath !== command.context.requiredPath) {
        // If we're not on the required path, navigate first
        await router.push(command.context.requiredPath);
        // Wait for navigation
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return command.perform();
  }
}

export const commandRegistry = new CommandRegistryImpl();
