"use client";

import { Inter } from "next/font/google";
import "../app/globals.css";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Loading() {
  // Use client-side rendering to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Set document title on the client side
    document.title = "Loading - FluidCalendar";
  }, []);

  // Only render the full content after mounting on the client
  if (!mounted) {
    return null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="description" content="Loading content" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading...</p>
        </div>
      </body>
    </html>
  );
}
