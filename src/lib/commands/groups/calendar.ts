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
import { create } from "zustand";

// Create a store for managing event modal state
interface EventModalStore {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  defaultDate?: Date;
  setDefaultDate: (date?: Date) => void;
  defaultEndDate?: Date;
  setDefaultEndDate: (date?: Date) => void;
}

export const useEventModalStore = create<EventModalStore>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  defaultDate: undefined,
  setDefaultDate: (date) => set({ defaultDate: date }),
  defaultEndDate: undefined,
  setDefaultEndDate: (date) => set({ defaultEndDate: date }),
}));

export function useCalendarCommands(): Command[] {
  const { date: currentDate, setDate } = useViewStore();
  const { isSidebarOpen, setSidebarOpen } = useCalendarUIStore();

  const calendarContext = {
    requiredPath: "/calendar",
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
      context: {
        requiredPath: "/calendar",
        navigateIfNeeded: false,
      },
    },
    {
      id: "calendar.next-week",
      title: "Next Week",
      keywords: ["calendar", "next", "week", "forward"],
      icon: HiOutlineChevronRight,
      section: "calendar",
      perform: () => setDate(addDays(currentDate, 7)),
      shortcut: "right",
      context: {
        requiredPath: "/calendar",
        navigateIfNeeded: false,
      },
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
        const now = newDate();
        useEventModalStore.getState().setDefaultDate(now);
        useEventModalStore
          .getState()
          .setDefaultEndDate(newDate(now.getTime() + 3600000)); // 1 hour later
        useEventModalStore.getState().setOpen(true);
      },
      shortcut: "ne",
      context: calendarContext,
    },
  ];
}
