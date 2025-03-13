"use client";

import { Inter } from "next/font/google";
import "../app/globals.css";
import Link from "next/link";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

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
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Something went wrong!</h1>
          <p className="mb-6">An unexpected error has occurred.</p>
          <div className="flex space-x-4">
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
