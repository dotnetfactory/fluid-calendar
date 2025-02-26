import { IconType } from "react-icons";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
export interface CommandContext {
  requiredPath: string; // The path where this command should work
  navigateIfNeeded: boolean; // Whether to auto-navigate if not on required path
}

export interface Command {
  id: string;
  title: string;
  keywords: string[];
  icon?: IconType;
  section:
    | "navigation"
    | "calendar"
    | "tasks"
    | "settings"
    | "system"
    | "focus"
    | "privacy";
  perform: (router?: AppRouterInstance) => void | Promise<void>; // Router will be passed from the command registry
  shortcut?: string;
  context?: CommandContext;
}

export interface CommandGroup {
  name: string;
  commands: Command[];
}

export type CommandRegistry = Map<string, Command>;
