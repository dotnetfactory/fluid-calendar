"use client";

import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PrivacyProvider } from "@/components/providers/PrivacyProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppNav } from "@/components/navigation/AppNav";
import { DndProvider } from "@/components/dnd/DndProvider";
import { CommandPalette } from "@/components/ui/command-palette";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { useShortcutsStore } from "@/store/shortcuts";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

const getTitleFromPathname = (pathname: string) => {
  switch (pathname) {
    case "/":
      return "Calendar | FluidCalendar";
    case "/tasks":
      return "Tasks | FluidCalendar";
    case "/focus":
      return "Focus | FluidCalendar";
    case "/settings":
      return "Settings | FluidCalendar";
    default:
      return "FluidCalendar";
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { isOpen: shortcutsOpen, setOpen: setShortcutsOpen } =
    useShortcutsStore();
  const pathname = usePathname();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      } else if (e.key === "?" && !(e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setShortcutsOpen]);

  return (
    <html lang="en" className="h-full">
      <head>
        <title>{getTitleFromPathname(pathname)}</title>
      </head>
      <body
        className={cn(
          inter.className,
          "h-full bg-background antialiased",
          "flex flex-col"
        )}
      >
        <SessionProvider>
          <ThemeProvider>
            <PrivacyProvider>
              <DndProvider>
                <CommandPalette
                  open={commandPaletteOpen}
                  onOpenChange={setCommandPaletteOpen}
                />
                <ShortcutsModal
                  isOpen={shortcutsOpen}
                  onClose={() => setShortcutsOpen(false)}
                />
                <AppNav />
                <main className="flex-1 relative">{children}</main>
              </DndProvider>
            </PrivacyProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
