"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { inter } from "@/lib/fonts";

import "../app/globals.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Use client-side rendering to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Set document title on the client side
    document.title = "Error - FluidCalendar";
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  // Only render the full content after mounting on the client
  if (!mounted) {
    return null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="description" content="An error occurred" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="mb-4 text-4xl font-bold">Something went wrong!</h1>
          <p className="mb-6">An unexpected error has occurred.</p>
          <div className="flex space-x-4">
            <button
              onClick={reset}
              className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded bg-gray-500 px-4 py-2 text-white transition-colors hover:bg-gray-600"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
