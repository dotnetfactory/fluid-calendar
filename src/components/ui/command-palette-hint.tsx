"use client";

import { useState, useEffect } from "react";
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
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-background border rounded-lg shadow-lg p-4 max-w-xs">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-primary font-medium">
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

        <p className="text-sm text-foreground mb-3">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd>{" "}
          (or{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+K</kbd>)
          to open the command palette and quickly access features.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={dismissHint}
            className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
          <button
            onClick={openCommandPalette}
            className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try it now
          </button>
        </div>
      </div>
    </div>
  );
}
