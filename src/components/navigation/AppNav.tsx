"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { BsListTask, BsCalendar, BsCalendarCheck } from "react-icons/bs";
import { HiOutlineLightBulb, HiOutlineSearch } from "react-icons/hi";
import { RiKeyboardLine } from "react-icons/ri";

import { cn } from "@/lib/utils";

import { useShortcutsStore } from "@/store/shortcuts";
import { useSubscription } from "@saas/hooks/useSubscription";

import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

interface AppNavProps {
  className?: string;
}

export function AppNav({ className }: AppNavProps) {
  const pathname = usePathname();
  const { setOpen: setShortcutsOpen } = useShortcutsStore();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription();

  // Check if we're on pricing page and user doesn't have subscription
  const isPricingPageWithoutSubscription = pathname === "/pricing" && !hasActiveSubscription && !subscriptionLoading;

  // Function to trigger command palette
  const openCommandPalette = () => {
    // Disable command palette on pricing page without subscription
    if (isPricingPageWithoutSubscription) return;

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
    { href: "/bookings", label: "Bookings", icon: BsCalendarCheck },
    { href: "/focus", label: "Focus", icon: HiOutlineLightBulb },
  ];

  return (
    <nav
      className={cn(
        "z-10 h-16 flex-none border-b border-border bg-background",
        isPricingPageWithoutSubscription && "bg-yellow-50 dark:bg-yellow-950/20",
        className
      )}
    >
      <div className="h-full px-4">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo - disable navigation on pricing page without subscription */}
            {isPricingPageWithoutSubscription ? (
              <div className="flex items-center mr-8 cursor-not-allowed opacity-50">
                <Image
                  src="/logo.svg"
                  alt="Calendar Logo"
                  width={28}
                  height={28}
                  className="mr-2"
                />
              </div>
            ) : (
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
            )}

            {/* Navigation links - disable on pricing page without subscription */}
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              const isDisabled = isPricingPageWithoutSubscription;

              if (isDisabled) {
                return (
                  <div
                    key={link.href}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                      "cursor-not-allowed opacity-50 text-muted-foreground"
                    )}
                    title="Subscription required"
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </div>
                );
              }

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

            {/* Subscription required indicator */}
            {isPricingPageWithoutSubscription && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-md text-xs font-medium text-yellow-800 dark:text-yellow-200">
                <span>🔒</span>
                <span>Choose a plan to unlock features</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Search - disable on pricing page without subscription */}
            <button
              onClick={openCommandPalette}
              disabled={isPricingPageWithoutSubscription}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs",
                isPricingPageWithoutSubscription
                  ? "cursor-not-allowed opacity-50 text-muted-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={isPricingPageWithoutSubscription ? "Subscription required" : "Search or run a command (⌘K)"}
            >
              <HiOutlineSearch className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="ml-1 hidden rounded bg-muted px-1 py-0.5 text-xs sm:inline">
                ⌘K
              </kbd>
            </button>

            <ThemeToggle />

            {/* Shortcuts - disable on pricing page without subscription */}
            <button
              onClick={() => isPricingPageWithoutSubscription ? null : setShortcutsOpen(true)}
              disabled={isPricingPageWithoutSubscription}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1.5 text-xs",
                isPricingPageWithoutSubscription
                  ? "cursor-not-allowed opacity-50 text-muted-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={isPricingPageWithoutSubscription ? "Subscription required" : "View Keyboard Shortcuts (Press ?)"}
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
