"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import { inter } from "@/lib/fonts";
import { getTitleFromPathname } from "@/lib/utils/page-title";

import "../app/globals.css";

export default function Loading() {
  // Use client-side rendering to avoid hydration issues
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    // Set document title on the client side
    const title = getTitleFromPathname(pathname);
    document.title = `Loading ${title}`;
  }, [pathname]);

  // Only render the full content after mounting on the client
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
      <p className={inter.className}>Loading...</p>
    </div>
  );
}
