import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMenu,
  HiOutlinePlus,
} from "react-icons/hi";
import { Command } from "../types";
import { useViewStore, useCalendarUIStore } from "@/store/calendar";
import { addDays, newDate, subDays } from "@/lib/date-utils";
import { useRouter } from "next/navigation";

export function useCalendarCommands(): Command[] {
  const { date: currentDate, setDate } = useViewStore();
  const { isSidebarOpen, setSidebarOpen } = useCalendarUIStore();
  const router = useRouter();

  const calendarContext = {
    requiredPath: "/",
    navigateIfNeeded: true,
  };

  return [
    {
      id: "calendar.today",
      title: "Go to Today",
      keywords: ["calendar", "today", "now", "current"],
      icon: HiOutlineCalendar,
      section: "calendar",
      perform: () => setDate(newDate()),
      shortcut: "t",
      context: calendarContext,
    },
    {
      id: "calendar.prev-week",
      title: "Previous Week",
      keywords: ["calendar", "previous", "week", "back"],
      icon: HiOutlineChevronLeft,
      section: "calendar",
      perform: () => setDate(subDays(currentDate, 7)),
      shortcut: "left",
      context: calendarContext,
    },
    {
      id: "calendar.next-week",
      title: "Next Week",
      keywords: ["calendar", "next", "week", "forward"],
      icon: HiOutlineChevronRight,
      section: "calendar",
      perform: () => setDate(addDays(currentDate, 7)),
      shortcut: "right",
      context: calendarContext,
    },
    {
      id: "calendar.toggle-sidebar",
      title: "Toggle Calendar Sidebar",
      keywords: ["calendar", "sidebar", "toggle", "show", "hide"],
      icon: HiOutlineMenu,
      section: "calendar",
      perform: () => setSidebarOpen(!isSidebarOpen),
      shortcut: "b",
      context: calendarContext,
    },
    {
      id: "calendar.new-event",
      title: "Create New Event",
      keywords: ["calendar", "event", "new", "create", "add"],
      icon: HiOutlinePlus,
      section: "calendar",
      perform: () => {
        // TODO: Implement event creation
        console.log("Create new event");
      },
      shortcut: "e",
      context: calendarContext,
    },
  ];
}
