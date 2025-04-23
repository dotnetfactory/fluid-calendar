"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { inter } from "@/lib/fonts";

import "../app/globals.css";

export default function NotFound() {
  // Use client-side rendering to avoid hydration issues
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Set document title on the client side
    document.title = "404 - Page Not Found";
  }, []);

  // Only render the full content after mounting on the client
  if (!mounted) {
    return null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="description"
          content="The page you're looking for doesn't exist or has been moved."
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h1 className="mb-4 text-4xl font-bold">404 - Page Not Found</h1>
          <p className="mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link
            href="/"
            className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
          >
            Return Home
          </Link>
        </div>
      </body>
    </html>
  );
}
