"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BsCalendar, BsGear, BsListTask } from "react-icons/bs";
import { HiOutlineLightBulb } from "react-icons/hi";
import { cn } from "@/lib/utils";
import { RiKeyboardLine } from "react-icons/ri";
import { useShortcutsStore } from "@/store/shortcuts";

interface AppNavProps {
  className?: string;
}

export function AppNav({ className }: AppNavProps) {
  const pathname = usePathname();
  const { setOpen: setShortcutsOpen } = useShortcutsStore();

  const links = [
    { href: "/", label: "Calendar", icon: BsCalendar },
    { href: "/tasks", label: "Tasks", icon: BsListTask },
    { href: "/focus", label: "Focus", icon: HiOutlineLightBulb },
    { href: "/settings", label: "Settings", icon: BsGear },
  ];

  return (
    <nav
      className={cn(
        "h-16 bg-white border-b border-gray-200 flex-none z-10",
        className
      )}
    >
      <div className="h-full px-4">
        <div className="h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-900 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
            title="View Keyboard Shortcuts (Press ?)"
          >
            <RiKeyboardLine className="h-4 w-4" />
            <span className="hidden sm:inline">Shortcuts</span>
            <kbd className="hidden sm:inline ml-1 text-xs bg-gray-50 px-1 py-0.5 rounded">
              ?
            </kbd>
          </button>
        </div>
      </div>
    </nav>
  );
}
