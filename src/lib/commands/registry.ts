import { Command, CommandRegistry } from "./types";

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

      const matches = searchTerms.every((term) =>
        searchableText.includes(term)
      );
      console.log(
        matches,
        command.id,
        command.title,
        searchableText,
        searchTerms
      );
      return matches;
    });
  }

  execute(commandId: string) {
    const command = this.commands.get(commandId);
    if (command) {
      return command.perform();
    }
    throw new Error(`Command ${commandId} not found`);
  }
}

export const commandRegistry = new CommandRegistryImpl();
