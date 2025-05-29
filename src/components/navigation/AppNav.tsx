"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { BsListTask, BsCalendar } from "react-icons/bs";
import { HiOutlineLightBulb, HiOutlineSearch } from "react-icons/hi";
import { RiKeyboardLine } from "react-icons/ri";

import { cn } from "@/lib/utils";

import { useShortcutsStore } from "@/store/shortcuts";

import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

interface AppNavProps {
  className?: string;
}

export function AppNav({ className }: AppNavProps) {
  const pathname = usePathname();
  const { setOpen: setShortcutsOpen } = useShortcutsStore();

  // Function to trigger command palette
  const openCommandPalette = () => {
    // Simulate Cmd+K / Ctrl+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  const links = [
    { href: "/calendar", label: "Calendar", icon: BsCalendar },
    { href: "/tasks", label: "Tasks", icon: BsListTask },
    { href: "/focus", label: "Focus", icon: HiOutlineLightBulb },
  ];

  return (
    <nav
      className={cn(
        "z-10 h-16 flex-none border-b border-border bg-background",
        className
      )}
    >
      <div className="h-full px-4">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/calendar"
              className={cn(
                "flex items-center mr-8",
                pathname === "/calendar" ? "text-primary" : "text-foreground hover:text-primary"
              )}
            >
              <Image
                src="/logo.svg"
                alt="Calendar Logo"
                width={28}
                height={28}
                className="mr-2"
              />
            </Link>
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCommandPalette}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Search or run a command (⌘K)"
            >
              <HiOutlineSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="ml-1 hidden rounded bg-muted px-1 py-0.5 text-xs sm:inline">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle />
            <button
              onClick={() => setShortcutsOpen(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              title="View Keyboard Shortcuts (Press ?)"
            >
              <RiKeyboardLine className="h-4 w-4" />
              <span className="hidden sm:inline">Shortcuts</span>
              <kbd className="ml-1 hidden rounded bg-muted px-1 py-0.5 text-xs sm:inline">
                ?
              </kbd>
            </button>
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
