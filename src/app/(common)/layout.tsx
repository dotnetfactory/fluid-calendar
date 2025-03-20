"use client";

import { useState, useEffect } from "react";
import { inter } from "@/lib/fonts";
import "../globals.css";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PrivacyProvider } from "@/components/providers/PrivacyProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppNav } from "@/components/navigation/AppNav";
import { DndProvider } from "@/components/dnd/DndProvider";
import { CommandPalette } from "@/components/ui/command-palette";
import { CommandPaletteHint } from "@/components/ui/command-palette-hint";
import { CommandPaletteFab } from "@/components/ui/command-palette-fab";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { useShortcutsStore } from "@/store/shortcuts";
import { usePathname } from "next/navigation";
import { SetupCheck } from "@/components/setup/SetupCheck";
import { Toaster } from "@/components/ui/sonner";
import dynamic from "next/dynamic";

// Dynamically import the NotificationProvider based on SAAS flag
const NotificationProvider = dynamic<{ children: React.ReactNode }>(
  () =>
    import(
      `@/components/providers/NotificationProvider${
        process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true"
          ? ".saas"
          : ".open"
      }`
    ).then((mod) => mod.NotificationProvider),
  {
    ssr: false,
    loading: () => <>{/* Render nothing while loading */}</>,
  }
);

const getTitleFromPathname = (pathname: string) => {
  switch (pathname) {
    case "/calendar":
      return "Calendar | FluidCalendar";
    case "/tasks":
      return "Tasks | FluidCalendar";
    case "/focus":
      return "Focus | FluidCalendar";
    case "/settings":
      return "Settings | FluidCalendar";
    case "/setup":
      return "Setup | FluidCalendar";
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
    <html lang="en" className="h-full" suppressHydrationWarning>
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
          <ThemeProvider attribute="data-theme" enableSystem={true}>
            <PrivacyProvider>
              <DndProvider>
                <SetupCheck />
                <CommandPalette
                  open={commandPaletteOpen}
                  onOpenChange={setCommandPaletteOpen}
                />
                <CommandPaletteHint />
                <CommandPaletteFab />
                <ShortcutsModal
                  isOpen={shortcutsOpen}
                  onClose={() => setShortcutsOpen(false)}
                />
                <AppNav />
                <main className="flex-1 relative">
                  <NotificationProvider>{children}</NotificationProvider>
                </main>
                <Toaster />
              </DndProvider>
            </PrivacyProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
