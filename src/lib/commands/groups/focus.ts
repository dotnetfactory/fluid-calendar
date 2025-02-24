import { useRouter } from "next/navigation";
import {
  HiOutlineLightBulb,
  HiOutlineX,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineCheck,
  HiOutlineArrowRight,
} from "react-icons/hi";
import { Command } from "../types";
import { useFocusModeStore } from "@/store/focusMode";

export function useFocusCommands(): Command[] {
  const router = useRouter();
  const focusMode = useFocusModeStore();

  const focusContext = {
    navigateIfNeeded: true,
    requiredPath: "/focus",
  };

  return [
    {
      id: "focus.start",
      title: "Start Focus Mode",
      keywords: ["focus", "start", "mode", "concentrate"],
      icon: HiOutlineLightBulb,
      section: "focus",
      shortcut: "f",
      context: focusContext,
      perform: () => {
        router.push("/focus");
      },
    },
    {
      id: "focus.end",
      title: "End Focus Mode",
      keywords: ["focus", "end", "exit", "stop"],
      icon: HiOutlineX,
      section: "focus",
      shortcut: "shift+f",
      context: focusContext,
      perform: () => {
        focusMode.endFocusMode();
        router.push("/");
      },
    },
    {
      id: "focus.pause",
      title: "Pause Focus Mode",
      keywords: ["focus", "pause", "break", "stop"],
      icon: HiOutlinePause,
      section: "focus",
      shortcut: "alt+f",
      context: focusContext,
      perform: () => {
        focusMode.pauseFocusMode();
      },
    },
    {
      id: "focus.resume",
      title: "Resume Focus Mode",
      keywords: ["focus", "resume", "continue", "start"],
      icon: HiOutlinePlay,
      section: "focus",
      shortcut: "alt+r",
      context: focusContext,
      perform: () => {
        focusMode.resumeFocusMode();
      },
    },
    {
      id: "focus.complete",
      title: "Complete Current Task",
      keywords: ["focus", "complete", "done", "finish"],
      icon: HiOutlineCheck,
      section: "focus",
      shortcut: "alt+c",
      context: focusContext,
      perform: () => {
        focusMode.completeCurrentTask();
      },
    },
    {
      id: "focus.next",
      title: "Switch to Next Task",
      keywords: ["focus", "next", "switch", "task"],
      icon: HiOutlineArrowRight,
      section: "focus",
      shortcut: "alt+n",
      context: focusContext,
      perform: () => {
        const nextTaskId = focusMode.queuedTaskIds[0];
        if (nextTaskId) {
          focusMode.switchToTask(nextTaskId);
        }
      },
    },
  ];
}
