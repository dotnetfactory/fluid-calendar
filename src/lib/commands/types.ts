import { IconType } from "react-icons";

export interface Command {
  id: string;
  title: string;
  keywords: string[];
  icon?: IconType;
  section: "navigation" | "calendar" | "tasks" | "settings";
  perform: () => void | Promise<void>;
  shortcut?: string;
}

export interface CommandGroup {
  name: string;
  commands: Command[];
}

export type CommandRegistry = Map<string, Command>;
