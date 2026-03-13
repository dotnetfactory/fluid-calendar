"use client";

import { useEffect, useState } from "react";

import { HiOutlineSearch } from "react-icons/hi";
import { IoClose } from "react-icons/io5";

export function CommandPaletteHint() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has seen the hint before
    const hasSeenHint = localStorage.getItem("hasSeenCommandPaletteHint");

    if (!hasSeenHint) {
      // Show the hint after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const dismissHint = () => {
    setIsVisible(false);
    // Mark that the user has seen the hint
    localStorage.setItem("hasSeenCommandPaletteHint", "true");
  };

  // Trigger command palette
  const openCommandPalette = () => {
    dismissHint();
    // Simulate Cmd+K / Ctrl+K
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 duration-300 animate-in fade-in slide-in-from-bottom-4">
      <div className="max-w-xs rounded-lg border bg-background p-4 shadow-lg">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2 font-medium text-primary">
            <HiOutlineSearch className="h-5 w-5" />
            <span>Quick Tip</span>
          </div>
          <button
            onClick={dismissHint}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Dismiss hint"
          >
            <IoClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-foreground">
          Press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>{" "}
          (or{" "}
          <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs">Ctrl+K</kbd>)
          to open the command palette and quickly access features.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={dismissHint}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
          <button
            onClick={openCommandPalette}
            className="rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground hover:bg-primary/90"
          >
            Try it now
          </button>
        </div>
      </div>
    </div>
  );
}
