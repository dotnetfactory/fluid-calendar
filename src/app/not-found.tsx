"use client";

import Link from "next/link";
import { Inter } from "next/font/google";
import "../app/globals.css";
import { useEffect, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

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
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
          <p className="mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </body>
    </html>
  );
}
