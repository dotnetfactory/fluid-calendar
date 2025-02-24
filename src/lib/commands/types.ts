import { IconType } from "react-icons";

export interface CommandContext {
  requiredPath: string; // The path where this command should work
  navigateIfNeeded: boolean; // Whether to auto-navigate if not on required path
}

export interface Command {
  id: string;
  title: string;
  keywords: string[];
  icon?: IconType;
  section: "navigation" | "calendar" | "tasks" | "settings";
  perform: () => void | Promise<void>;
  shortcut?: string;
  context?: CommandContext;
}

export interface CommandGroup {
  name: string;
  commands: Command[];
}

export type CommandRegistry = Map<string, Command>;
