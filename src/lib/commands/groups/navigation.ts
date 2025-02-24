import {
  HiOutlineCalendar,
  HiOutlineClipboardList,
  HiOutlineCog,
} from "react-icons/hi";
import { Command } from "../types";
import { useRouter } from "next/navigation";

export function useNavigationCommands(): Command[] {
  const router = useRouter();

  return [
    {
      id: "navigation.calendar",
      title: "Go to Calendar",
      keywords: ["navigation"],
      icon: HiOutlineCalendar,
      section: "navigation",
      shortcut: "gc",
      perform: () => {
        router.push("/");
      },
    },
    {
      id: "navigation.tasks",
      title: "Go to Tasks",
      keywords: ["navigation"],
      icon: HiOutlineClipboardList,
      section: "navigation",
      shortcut: "gt",
      perform: () => {
        router.push("/tasks");
      },
    },
    {
      id: "navigation.settings",
      title: "Go to Settings",
      keywords: ["navigation"],
      icon: HiOutlineCog,
      section: "navigation",
      shortcut: "gs",
      perform: () => {
        router.push("/settings");
      },
    },
  ];
}
