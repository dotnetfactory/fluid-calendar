"use client";

import { useState, useEffect } from "react";
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
        "fixed bottom-4 right-4 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg",
        "hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "transition-all duration-300 ease-in-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-10 pointer-events-none"
      )}
      aria-label="Open command palette"
      title="Search or run a command (⌘K)"
    >
      <HiOutlineSearch className="h-5 w-5" />
    </button>
  );
}
