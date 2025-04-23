"use client";

import { useEffect, useState } from "react";

import { HiOutlineSearch } from "react-icons/hi";

import { cn } from "@/lib/utils";

export function CommandPaletteFab() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show the FAB when the user scrolls down more than 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openCommandPalette = () => {
    // Simulate Cmd+K / Ctrl+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={openCommandPalette}
      className={cn(
        "fixed bottom-4 right-4 z-40 rounded-full bg-primary p-3 text-primary-foreground shadow-lg",
        "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "transition-all duration-300 ease-in-out",
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-10 opacity-0"
      )}
      aria-label="Open command palette"
      title="Search or run a command (⌘K)"
    >
      <HiOutlineSearch className="h-5 w-5" />
    </button>
  );
}
