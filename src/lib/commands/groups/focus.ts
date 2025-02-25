import { HiOutlineCheck, HiOutlineArrowRight } from "react-icons/hi";
import { Command } from "../types";
import { useFocusModeStore } from "@/store/focusMode";

export function useFocusCommands(): Command[] {
  const focusMode = useFocusModeStore();

  const focusContext = {
    navigateIfNeeded: false,
    requiredPath: "/focus",
  };

  return [
    {
      id: "focus.complete",
      title: "Complete Current Task",
      keywords: ["focus", "complete", "done", "finish"],
      icon: HiOutlineCheck,
      section: "focus",
      shortcut: "",
      context: focusContext,
      perform: () => {
        focusMode.completeCurrentTask();
      },
    },
    // {
    //   id: "focus.next",
    //   title: "Switch to Next Task",
    //   keywords: ["focus", "next", "switch", "task"],
    //   icon: HiOutlineArrowRight,
    //   section: "focus",
    //   shortcut: "n",
    //   context: focusContext,
    //   perform: () => {
    //     const nextTaskId = focusMode.queuedTaskIds[0];
    //     if (nextTaskId) {
    //       focusMode.switchToTask(nextTaskId);
    //     }
    //   },
    // },
  ];
}
