import { HiOutlinePlus } from "react-icons/hi";
import { Command } from "../types";
import { useTaskModalStore } from "@/store/taskModal";

export function useTaskCommands(): Command[] {
  return [
    {
      id: "tasks.create",
      title: "Create Task",
      keywords: ["task", "new", "add", "create"],
      icon: HiOutlinePlus,
      section: "tasks",
      shortcut: "nt", // 'n' for new, 't' for task
      context: {
        navigateIfNeeded: true,
        requiredPath: "/tasks",
      },
      perform: () => {
        useTaskModalStore.getState().setOpen(true);
      },
    },
  ];
}
