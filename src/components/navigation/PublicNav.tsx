"use client";

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { UserMenu } from "./UserMenu";

interface PublicNavProps {
  className?: string;
}

export function PublicNav({ className }: PublicNavProps) {
  const publicLinks = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
  ];

  const handleScrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.getElementById(href.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <nav
      className={cn(
        "z-10 h-16 flex-none border-b border-border bg-background/80 backdrop-blur-md",
        className
      )}
    >
      <div className="h-full px-4">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center mr-8 text-foreground hover:text-primary"
            >
              <Image
                src="/logo.svg"
                alt="FluidCalendar Logo"
                width={28}
                height={28}
                className="mr-2"
              />
              <span className="font-semibold text-lg">FluidCalendar</span>
            </Link>

            {/* Public navigation links */}
            {publicLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleScrollToSection(link.href)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
                  "text-foreground hover:bg-muted transition-colors"
                )}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
