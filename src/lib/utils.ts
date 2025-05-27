import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Detects if the current platform is macOS
 * @returns boolean indicating if the user is on a Mac
 */
export function isMacOS(): boolean {
  if (typeof window === "undefined") return false;
  return window.navigator.userAgent.indexOf("Mac") !== -1;
}

/**
 * Formats a keyboard shortcut string for display
 * @param shortcut The shortcut string (e.g. "alt+shift+p" or "gc")
 * @returns A formatted string for display
 */
export function formatShortcut(shortcut?: string): string {
  if (!shortcut) return "";

  // If the shortcut contains a plus sign, it's a modifier-based shortcut
  if (shortcut.includes("+")) {
    const parts = shortcut.split("+");
    const isMac = isMacOS();

    return parts
      .map((part) => {
        if (part === "alt") return isMac ? "⌥" : "Alt";
        if (part === "ctrl") return isMac ? "⌃" : "Ctrl";
        if (part === "meta") return isMac ? "⌘" : "Win";
        if (part === "shift") return isMac ? "⇧" : "Shift";
        if (part === "left") return "←";
        if (part === "right") return "→";
        if (part === "up") return "↑";
        if (part === "down") return "↓";
        return part;
      })
      .join(" + ");
  }

  // For letter-based shortcuts, just return the shortcut as is
  return shortcut;
}

/**
 * Get the base URL for API calls
 * @returns The base URL string
 */
export function getBaseUrl(): string {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
