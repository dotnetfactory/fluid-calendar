"use client";

import { useEffect } from "react";

import { useSession } from "next-auth/react";

import { initializeStores } from "@/lib/auth/store-management";

/**
 * StoreInitializer component
 *
 * This component initializes all application stores when:
 * 1. The app is mounted (first load)
 * 2. User session status changes to authenticated
 *
 * It's designed to be placed in a high-level layout component
 */
export function StoreInitializer() {
  const { status, data: session } = useSession();

  useEffect(() => {
    // Initialize stores on first component mount
    initializeStores().catch((error) => {
      console.error("Failed to initialize stores on mount:", error);
    });
  }, []);

  // Re-initialize when user logs in (session status changes to authenticated)
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      initializeStores().catch((error) => {
        console.error("Failed to initialize stores after login:", error);
      });
    }
  }, [status, session]);

  // Render nothing - this is just a background behavior component
  return null;
}
