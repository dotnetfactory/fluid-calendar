"use client";

import { useState, useEffect } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AppNav } from "@/components/navigation/AppNav";
import { DndProvider } from "@/components/dnd/DndProvider";
import { CommandPalette } from "@/components/ui/command-palette";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <html lang="en" className="h-full">
      <body
        className={cn(
          inter.className,
          "h-full bg-background antialiased",
          "flex flex-col"
        )}
      >
        <SessionProvider>
          <DndProvider>
            <CommandPalette
              open={commandPaletteOpen}
              onOpenChange={setCommandPaletteOpen}
            />
            <AppNav />
            <main className="flex-1 relative">{children}</main>
          </DndProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
